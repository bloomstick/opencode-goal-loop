@echo off
powershell -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%USERPROFILE%\.config\opencode\goal-supervisor\Get-GoalSupervisors.ps1" %*
