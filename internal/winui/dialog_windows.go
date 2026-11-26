//go:build windows

package winui

import (
	"syscall"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	comdlg32         = syscall.NewLazyDLL("comdlg32.dll")
	procMessageBoxW  = user32.NewProc("MessageBoxW")
	procGetOpenFileW = comdlg32.NewProc("GetOpenFileNameW")
)

const (
	mbOK              = 0x00000000
	mbYesNo           = 0x00000004
	mbIconError       = 0x00000010
	mbIconQuestion    = 0x00000020
	mbIconInformation = 0x00000040
	mbTopmost         = 0x00040000
	idYes             = 6

	ofnFileMustExist = 0x00001000
	ofnPathMustExist = 0x00000800
	ofnNoChangeDir   = 0x00000008
)

type openFileName struct {
	lStructSize       uint32
	hwndOwner         uintptr
	hInstance         uintptr
	lpstrFilter       *uint16
	lpstrCustomFilter *uint16
	nMaxCustFilter    uint32
	nFilterIndex      uint32
	lpstrFile         *uint16
	nMaxFile          uint32
	lpstrFileTitle    *uint16
	nMaxFileTitle     uint32
	lpstrInitialDir   *uint16
	lpstrTitle        *uint16
	flags             uint32
	nFileOffset       uint16
	nFileExtension    uint16
	lpstrDefExt       *uint16
	lCustData         uintptr
	lpfnHook          uintptr
	lpTemplateName    *uint16
	pvReserved        unsafe.Pointer
	dwReserved        uint32
	flagsEx           uint32
}

func messageBox(title, text string, flags uint32) int32 {
	tPtr, _ := syscall.UTF16PtrFromString(title)
	mPtr, _ := syscall.UTF16PtrFromString(text)
	ret, _, _ := procMessageBoxW.Call(
		0,
		uintptr(unsafe.Pointer(mPtr)),
		uintptr(unsafe.Pointer(tPtr)),
		uintptr(flags|mbTopmost),
	)
	return int32(ret)
}

func MessageBoxInfo(title, text string) {
	messageBox(title, text, mbOK|mbIconInformation)
}

func MessageBoxError(title, text string) {
	messageBox(title, text, mbOK|mbIconError)
}

func MessageBoxConfirm(title, text string) bool {
	return messageBox(title, text, mbYesNo|mbIconQuestion) == idYes
}

// BrowseForExe opens a native Win32 file picker to select Antigravity.exe.
func BrowseForExe(title string) (string, bool) {
	buf := make([]uint16, 1024)
	titlePtr, _ := syscall.UTF16PtrFromString(title)
	// Double-NUL terminated Win32 filter string.
	filterStr := "Antigravity (Antigravity.exe)\x00Antigravity.exe\x00Executable (*.exe)\x00*.exe\x00\x00"
	filterUTF16 := make([]uint16, 0, len(filterStr))
	for _, r := range filterStr {
		filterUTF16 = append(filterUTF16, uint16(r))
	}

	ofn := openFileName{
		lStructSize: uint32(unsafe.Sizeof(openFileName{})),
		lpstrFilter: &filterUTF16[0],
		lpstrFile:   &buf[0],
		nMaxFile:    uint32(len(buf)),
		lpstrTitle:  titlePtr,
		flags:       ofnFileMustExist | ofnPathMustExist | ofnNoChangeDir,
	}

	ret, _, _ := procGetOpenFileW.Call(uintptr(unsafe.Pointer(&ofn)))
	if ret == 0 {
		return "", false
	}
	return syscall.UTF16ToString(buf), true
}
