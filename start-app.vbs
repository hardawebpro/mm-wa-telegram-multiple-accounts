' Launch MM WA Telegram Multiple Accounts without a visible terminal window.
Option Explicit

Dim fso, shell, projectDir, nodeCheck, npmCheck

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = projectDir

If Not fso.FileExists(projectDir & "\package.json") Then
  shell.Popup "package.json not found." & vbCrLf & vbCrLf & "Run this launcher from the project folder.", 0, "MM WA Telegram Multiple Accounts", 16
  WScript.Quit 1
End If

If Not fso.FolderExists(projectDir & "\node_modules") Then
  shell.Popup "Dependencies are not installed." & vbCrLf & vbCrLf & "Run setup-first-time.bat first.", 0, "MM WA Telegram Multiple Accounts", 48
  WScript.Quit 1
End If

Set nodeCheck = shell.Exec("cmd /c where node")
Do While nodeCheck.Status = 0
  WScript.Sleep 50
Loop
If nodeCheck.ExitCode <> 0 Then
  shell.Popup "Node.js was not found." & vbCrLf & vbCrLf & "Install Node.js LTS from https://nodejs.org/", 0, "MM WA Telegram Multiple Accounts", 16
  WScript.Quit 1
End If

Set npmCheck = shell.Exec("cmd /c where npm")
Do While npmCheck.Status = 0
  WScript.Sleep 50
Loop
If npmCheck.ExitCode <> 0 Then
  shell.Popup "npm was not found." & vbCrLf & vbCrLf & "Reinstall Node.js LTS and ensure Add to PATH is enabled.", 0, "MM WA Telegram Multiple Accounts", 16
  WScript.Quit 1
End If

' 0 = hidden window
shell.Run "cmd /c npm run dev", 0, False
