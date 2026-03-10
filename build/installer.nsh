; MyOpenClaw NSIS custom install/uninstall hooks
; Pre-authorize node.exe for Windows Firewall to prevent blocking dialog on first run

!macro customInstall
  ; Remove old rules first (idempotent)
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MyOpenClaw Node" >nul 2>&1'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MyOpenClaw Runtime Node" >nul 2>&1'

  ; Bundled node (full build, inside install dir)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MyOpenClaw Node" dir=in action=allow program="$INSTDIR\resources\node\node.exe" enable=yes profile=any'

  ; Downloaded runtime node (simple build, user profile)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="MyOpenClaw Runtime Node" dir=in action=allow program="$PROFILE\.openclaw\runtime\node\node.exe" enable=yes profile=any'
!macroend

!macro customUnInstall
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MyOpenClaw Node" >nul 2>&1'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="MyOpenClaw Runtime Node" >nul 2>&1'
!macroend
