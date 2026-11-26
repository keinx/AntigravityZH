package main

import (
	"bytes"
	"debug/pe"
	"encoding/binary"
	"errors"
	"flag"
	"fmt"
	"os"
)

func main() {
	extractExe := flag.String("extract", "", "Source Windows .exe to extract primary icon from")
	icoPath := flag.String("ico", "", "Path to .ico file (output when -extract is set, input when -syso or -png is set)")
	sysoPath := flag.String("syso", "", "Output Windows amd64 .syso resource file")
	pngPath := flag.String("png", "", "Output largest PNG image extracted from .ico")
	flag.Parse()

	if *extractExe != "" {
		if *icoPath == "" {
			fatal(errors.New("-ico is required with -extract"))
		}
		if err := extractIconFromPE(*extractExe, *icoPath); err != nil {
			fatal(err)
		}
		fmt.Printf("Extracted icon to %s\n", *icoPath)
	}

	if *sysoPath != "" {
		if *icoPath == "" {
			fatal(errors.New("-ico is required with -syso"))
		}
		if err := buildSysoFromICO(*icoPath, *sysoPath); err != nil {
			fatal(err)
		}
		fmt.Printf("Generated COFF resource %s\n", *sysoPath)
	}

	if *pngPath != "" {
		if *icoPath == "" {
			fatal(errors.New("-ico is required with -png"))
		}
		if err := extractLargestPNGFromICO(*icoPath, *pngPath); err != nil {
			fatal(err)
		}
		fmt.Printf("Extracted largest PNG icon to %s\n", *pngPath)
	}
}

func fatal(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}

// --- Part 1: Extract full multi-resolution .ico from PE .rsrc ---

type rsrcDirEntry struct {
	ID       uint32
	IsSubdir bool
	Offset   uint32
}

func readDirEntries(rsrc []byte, off uint32) ([]rsrcDirEntry, error) {
	if int(off)+16 > len(rsrc) {
		return nil, errors.New("rsrc directory out of bounds")
	}
	numNamed := binary.LittleEndian.Uint16(rsrc[off+12 : off+14])
	numID := binary.LittleEndian.Uint16(rsrc[off+14 : off+16])
	total := int(numNamed) + int(numID)
	pos := int(off) + 16
	if pos+total*8 > len(rsrc) {
		return nil, errors.New("rsrc entries out of bounds")
	}
	entries := make([]rsrcDirEntry, 0, total)
	for i := 0; i < total; i++ {
		nameOrID := binary.LittleEndian.Uint32(rsrc[pos : pos+4])
		dataOrSub := binary.LittleEndian.Uint32(rsrc[pos+4 : pos+8])
		pos += 8
		entries = append(entries, rsrcDirEntry{
			ID:       nameOrID,
			IsSubdir: (dataOrSub & 0x80000000) != 0,
			Offset:   dataOrSub & 0x7FFFFFFF,
		})
	}
	return entries, nil
}

func readLeafData(rsrc []byte, rsrcVA uint32, langDirOff uint32) ([]byte, error) {
	langs, err := readDirEntries(rsrc, langDirOff)
	if err != nil || len(langs) == 0 {
		return nil, errors.New("no language entry in rsrc")
	}
	dataEntryOff := langs[0].Offset
	if int(dataEntryOff)+16 > len(rsrc) {
		return nil, errors.New("data entry out of bounds")
	}
	dataRVA := binary.LittleEndian.Uint32(rsrc[dataEntryOff : dataEntryOff+4])
	dataSize := binary.LittleEndian.Uint32(rsrc[dataEntryOff+4 : dataEntryOff+8])
	if dataRVA < rsrcVA {
		return nil, errors.New("invalid data RVA")
	}
	rawOff := dataRVA - rsrcVA
	if int(rawOff+dataSize) > len(rsrc) {
		return nil, errors.New("data payload out of bounds")
	}
	return rsrc[rawOff : rawOff+dataSize], nil
}

func extractIconFromPE(exePath, outICO string) error {
	f, err := pe.Open(exePath)
	if err != nil {
		return fmt.Errorf("open PE %s: %w", exePath, err)
	}
	defer f.Close()

	sec := f.Section(".rsrc")
	if sec == nil {
		return errors.New(".rsrc section not found")
	}
	rsrc, err := sec.Data()
	if err != nil {
		return fmt.Errorf("read .rsrc: %w", err)
	}
	rsrcVA := sec.VirtualAddress

	rootEntries, err := readDirEntries(rsrc, 0)
	if err != nil {
		return err
	}

	var iconDirOff, groupDirOff uint32
	var hasIcon, hasGroup bool
	for _, e := range rootEntries {
		if !e.IsSubdir {
			continue
		}
		if e.ID == 3 { // RT_ICON
			iconDirOff = e.Offset
			hasIcon = true
		} else if e.ID == 14 { // RT_GROUP_ICON
			groupDirOff = e.Offset
			hasGroup = true
		}
	}
	if !hasIcon || !hasGroup {
		return errors.New("RT_ICON or RT_GROUP_ICON not found in PE")
	}

	iconEntries, err := readDirEntries(rsrc, iconDirOff)
	if err != nil {
		return err
	}
	iconByID := make(map[uint16][]byte, len(iconEntries))
	for _, e := range iconEntries {
		if !e.IsSubdir {
			continue
		}
		data, err := readLeafData(rsrc, rsrcVA, e.Offset)
		if err == nil {
			iconByID[uint16(e.ID)] = data
		}
	}

	groupEntries, err := readDirEntries(rsrc, groupDirOff)
	if err != nil || len(groupEntries) == 0 {
		return errors.New("no RT_GROUP_ICON entries")
	}
	grpData, err := readLeafData(rsrc, rsrcVA, groupEntries[0].Offset)
	if err != nil {
		return err
	}
	if len(grpData) < 6 {
		return errors.New("invalid GRPICONDIR")
	}
	count := int(binary.LittleEndian.Uint16(grpData[4:6]))
	if len(grpData) < 6+count*14 {
		return errors.New("truncated GRPICONDIR entries")
	}

	type icoItem struct {
		hdr  [12]byte // width, height, colorCount, reserved, planes, bitCount, bytesInRes
		data []byte
	}
	items := make([]icoItem, 0, count)
	for i := 0; i < count; i++ {
		e := grpData[6+i*14 : 6+(i+1)*14]
		nID := binary.LittleEndian.Uint16(e[12:14])
		raw, ok := iconByID[nID]
		if !ok {
			continue
		}
		var item icoItem
		copy(item.hdr[:], e[:12])
		binary.LittleEndian.PutUint32(item.hdr[8:12], uint32(len(raw)))
		item.data = raw
		items = append(items, item)
	}
	if len(items) == 0 {
		return errors.New("no icon images resolved")
	}

	var out bytes.Buffer
	_ = binary.Write(&out, binary.LittleEndian, uint16(0))          // reserved
	_ = binary.Write(&out, binary.LittleEndian, uint16(1))          // type = icon
	_ = binary.Write(&out, binary.LittleEndian, uint16(len(items))) // count

	dataOffset := uint32(6 + len(items)*16)
	for _, it := range items {
		out.Write(it.hdr[:])
		_ = binary.Write(&out, binary.LittleEndian, dataOffset)
		dataOffset += uint32(len(it.data))
	}
	for _, it := range items {
		out.Write(it.data)
	}

	return os.WriteFile(outICO, out.Bytes(), 0o644)
}

// --- Part 2: Build Windows amd64 COFF .syso directly from .ico ---

func buildSysoFromICO(icoPath, sysoPath string) error {
	ico, err := os.ReadFile(icoPath)
	if err != nil {
		return err
	}
	if len(ico) < 6 {
		return errors.New("invalid .ico file")
	}
	count := int(binary.LittleEndian.Uint16(ico[4:6]))
	if count == 0 || len(ico) < 6+count*16 {
		return errors.New("invalid .ico directory")
	}

	type parsedIcon struct {
		entry12 [12]byte
		payload []byte
	}
	icons := make([]parsedIcon, 0, count)
	for i := 0; i < count; i++ {
		e := ico[6+i*16 : 6+(i+1)*16]
		size := binary.LittleEndian.Uint32(e[8:12])
		off := binary.LittleEndian.Uint32(e[12:16])
		if int(off+size) > len(ico) {
			return errors.New("icon payload out of bounds")
		}
		var pi parsedIcon
		copy(pi.entry12[:], e[:12])
		pi.payload = ico[off : off+size]
		icons = append(icons, pi)
	}

	// Build RT_GROUP_ICON payload (GRPICONDIR + count * 14-byte GRPICONDIRENTRY)
	var grpBuf bytes.Buffer
	_ = binary.Write(&grpBuf, binary.LittleEndian, uint16(0))
	_ = binary.Write(&grpBuf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&grpBuf, binary.LittleEndian, uint16(len(icons)))
	for i, ic := range icons {
		grpBuf.Write(ic.entry12[:])
		_ = binary.Write(&grpBuf, binary.LittleEndian, uint16(i+1)) // RT_ICON resource ID
	}
	grpPayload := grpBuf.Bytes()

	// Layout .rsrc section:
	// [0] Root dir (2 entries: RT_ICON=3, RT_GROUP_ICON=14) -> 16 + 2*8 = 32 bytes
	// [1] RT_ICON level-2 dir (count entries: ID 1..count) -> 16 + count*8 bytes
	// [2] RT_GROUP_ICON level-2 dir (1 entry: ID 1)        -> 16 + 1*8 = 24 bytes
	// [3] (count + 1) level-3 language dirs (1 entry each: lang 0x0409) -> (count+1)*24 bytes
	// [4] (count + 1) IMAGE_RESOURCE_DATA_ENTRY (16 bytes each)         -> (count+1)*16 bytes
	// [5] Payloads (4-byte aligned): icon[0..count-1], then grpPayload
	const dirHdrSize = 16
	const dirEntrySize = 8
	const dataEntrySize = 16

	rootSize := uint32(dirHdrSize + 2*dirEntrySize)
	iconL2Off := rootSize
	iconL2Size := uint32(dirHdrSize + len(icons)*dirEntrySize)
	grpL2Off := iconL2Off + iconL2Size
	grpL2Size := uint32(dirHdrSize + 1*dirEntrySize)

	l3BaseOff := grpL2Off + grpL2Size
	l3Stride := uint32(dirHdrSize + dirEntrySize)
	totalLeaves := len(icons) + 1
	dataEntriesOff := l3BaseOff + uint32(totalLeaves)*l3Stride
	payloadsOff := dataEntriesOff + uint32(totalLeaves)*dataEntrySize

	var rsrc bytes.Buffer
	writeDirHeader := func(numID uint16) {
		var h [16]byte
		binary.LittleEndian.PutUint16(h[14:16], numID)
		rsrc.Write(h[:])
	}
	writeDirEntry := func(id uint32, offset uint32, isSubdir bool) {
		var e [8]byte
		binary.LittleEndian.PutUint32(e[0:4], id)
		if isSubdir {
			offset |= 0x80000000
		}
		binary.LittleEndian.PutUint32(e[4:8], offset)
		rsrc.Write(e[:])
	}

	// [0] Root directory (sorted by ID: 3 then 14)
	writeDirHeader(2)
	writeDirEntry(3, iconL2Off, true)
	writeDirEntry(14, grpL2Off, true)

	// [1] RT_ICON level-2 directory
	writeDirHeader(uint16(len(icons)))
	for i := 0; i < len(icons); i++ {
		writeDirEntry(uint32(i+1), l3BaseOff+uint32(i)*l3Stride, true)
	}

	// [2] RT_GROUP_ICON level-2 directory
	writeDirHeader(1)
	writeDirEntry(1, l3BaseOff+uint32(len(icons))*l3Stride, true)

	// [3] Level-3 language directories (0x0409 = en-US)
	for i := 0; i < totalLeaves; i++ {
		writeDirHeader(1)
		writeDirEntry(0x0409, dataEntriesOff+uint32(i)*dataEntrySize, false)
	}

	// [4] IMAGE_RESOURCE_DATA_ENTRY table + collect relocations
	type reloc struct {
		virtualAddr uint32
	}
	relocs := make([]reloc, 0, totalLeaves)
	curPayloadOff := payloadsOff
	allPayloads := make([][]byte, 0, totalLeaves)
	for _, ic := range icons {
		allPayloads = append(allPayloads, ic.payload)
	}
	allPayloads = append(allPayloads, grpPayload)

	for i, pl := range allPayloads {
		entryOff := dataEntriesOff + uint32(i)*dataEntrySize
		relocs = append(relocs, reloc{virtualAddr: entryOff})
		var de [16]byte
		binary.LittleEndian.PutUint32(de[0:4], curPayloadOff)
		binary.LittleEndian.PutUint32(de[4:8], uint32(len(pl)))
		rsrc.Write(de[:])
		aligned := (uint32(len(pl)) + 3) &^ 3
		curPayloadOff += aligned
	}

	// [5] Payloads (4-byte aligned)
	for _, pl := range allPayloads {
		rsrc.Write(pl)
		if rem := len(pl) % 4; rem != 0 {
			rsrc.Write(make([]byte, 4-rem))
		}
	}

	rsrcBytes := rsrc.Bytes()

	// Wrap in Windows amd64 COFF object file (.syso)
	const (
		coffHdrSize     = 20
		secHdrSize      = 40
		relocSize       = 10
		symSize         = 18
		machineAMD64    = 0x8664
		relAMD64Addr32N = 0x0003 // IMAGE_REL_AMD64_ADDR32NB
		secFlags        = 0x40000040 // IMAGE_SCN_CNT_INITIALIZED_DATA | IMAGE_SCN_MEM_READ
	)

	rawDataPtr := uint32(coffHdrSize + secHdrSize)
	relocPtr := rawDataPtr + uint32(len(rsrcBytes))
	symTablePtr := relocPtr + uint32(len(relocs)*relocSize)

	var coff bytes.Buffer
	// COFF File Header (20 bytes)
	_ = binary.Write(&coff, binary.LittleEndian, uint16(machineAMD64))
	_ = binary.Write(&coff, binary.LittleEndian, uint16(1)) // NumberOfSections
	_ = binary.Write(&coff, binary.LittleEndian, uint32(0)) // TimeDateStamp
	_ = binary.Write(&coff, binary.LittleEndian, symTablePtr)
	_ = binary.Write(&coff, binary.LittleEndian, uint32(1)) // NumberOfSymbols
	_ = binary.Write(&coff, binary.LittleEndian, uint16(0)) // SizeOfOptionalHeader
	_ = binary.Write(&coff, binary.LittleEndian, uint16(0)) // Characteristics

	// Section Header: ".rsrc" (40 bytes)
	var secName [8]byte
	copy(secName[:], ".rsrc")
	coff.Write(secName[:])
	_ = binary.Write(&coff, binary.LittleEndian, uint32(0))              // VirtualSize
	_ = binary.Write(&coff, binary.LittleEndian, uint32(0))              // VirtualAddress
	_ = binary.Write(&coff, binary.LittleEndian, uint32(len(rsrcBytes))) // SizeOfRawData
	_ = binary.Write(&coff, binary.LittleEndian, rawDataPtr)             // PointerToRawData
	_ = binary.Write(&coff, binary.LittleEndian, relocPtr)               // PointerToRelocations
	_ = binary.Write(&coff, binary.LittleEndian, uint32(0))              // PointerToLinenumbers
	_ = binary.Write(&coff, binary.LittleEndian, uint16(len(relocs)))    // NumberOfRelocations
	_ = binary.Write(&coff, binary.LittleEndian, uint16(0))              // NumberOfLinenumbers
	_ = binary.Write(&coff, binary.LittleEndian, uint32(secFlags))       // Characteristics

	// Section Raw Data
	coff.Write(rsrcBytes)

	// Relocation Entries (10 bytes each)
	for _, r := range relocs {
		_ = binary.Write(&coff, binary.LittleEndian, r.virtualAddr)
		_ = binary.Write(&coff, binary.LittleEndian, uint32(0)) // SymbolTableIndex 0 (".rsrc")
		_ = binary.Write(&coff, binary.LittleEndian, uint16(relAMD64Addr32N))
	}

	// Symbol Table (1 symbol: ".rsrc", section 1, static storage class 3)
	coff.Write(secName[:])
	_ = binary.Write(&coff, binary.LittleEndian, uint32(0)) // Value
	_ = binary.Write(&coff, binary.LittleEndian, int16(1))  // SectionNumber (1-based)
	_ = binary.Write(&coff, binary.LittleEndian, uint16(0)) // Type
	coff.WriteByte(3)                                       // StorageClass = IMAGE_SYM_CLASS_STATIC
	coff.WriteByte(0)                                       // NumberOfAuxSymbols

	// String Table (4-byte size = 4, empty)
	_ = binary.Write(&coff, binary.LittleEndian, uint32(4))

	return os.WriteFile(sysoPath, coff.Bytes(), 0o644)
}

// --- Part 3: Extract highest-resolution PNG frame from .ico (for macOS .icns generation) ---

func extractLargestPNGFromICO(icoPath, outPNG string) error {
	ico, err := os.ReadFile(icoPath)
	if err != nil {
		return err
	}
	if len(ico) < 6 {
		return errors.New("invalid .ico file")
	}
	count := int(binary.LittleEndian.Uint16(ico[4:6]))
	if count == 0 || len(ico) < 6+count*16 {
		return errors.New("invalid .ico directory")
	}

	pngSig := []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}
	var best []byte
	bestArea := -1

	for i := 0; i < count; i++ {
		e := ico[6+i*16 : 6+(i+1)*16]
		w := int(e[0])
		if w == 0 {
			w = 256
		}
		h := int(e[1])
		if h == 0 {
			h = 256
		}
		size := binary.LittleEndian.Uint32(e[8:12])
		off := binary.LittleEndian.Uint32(e[12:16])
		if int(off+size) > len(ico) {
			return errors.New("icon payload out of bounds")
		}
		payload := ico[off : off+size]
		if len(payload) < len(pngSig) || !bytes.Equal(payload[:len(pngSig)], pngSig) {
			continue
		}
		area := w * h
		if area > bestArea || (area == bestArea && len(payload) > len(best)) {
			bestArea = area
			best = payload
		}
	}

	if len(best) == 0 {
		return errors.New("no PNG image found inside .ico")
	}
	return os.WriteFile(outPNG, best, 0o644)
}
