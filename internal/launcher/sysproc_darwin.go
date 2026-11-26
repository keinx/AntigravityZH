//go:build darwin

package launcher

import (
	"os/exec"
	"syscall"
)

func applyDetachedSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setsid: true,
	}
}
