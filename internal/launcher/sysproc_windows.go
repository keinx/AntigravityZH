//go:build windows

package launcher

import (
	"os/exec"
	"syscall"
)

func applyDetachedSysProcAttr(cmd *exec.Cmd) {
	const (
		createNewProcessGroup = 0x00000200
		detachedProcess       = 0x00000008
	)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: createNewProcessGroup | detachedProcess,
		HideWindow:    false,
	}
}
