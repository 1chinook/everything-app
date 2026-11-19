Option Explicit
Dim shell, files, folder, nodePath, command, result, errorPath, message
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
nodePath = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
If Not files.FileExists(nodePath) Then
  nodePath = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\nodejs\node.exe"
End If
If Not files.FileExists(nodePath) Then
  MsgBox "Node.js bulunamadi. Node.js kurulumunu kontrol et.", 16, "Everything App"
  WScript.Quit 1
End If
shell.CurrentDirectory = folder
command = Chr(34) & nodePath & Chr(34) & " " & Chr(34) & folder & "\launch-app.js" & Chr(34)
If WScript.Arguments.Named.Exists("restart") Then command = command & " --restart"
result = shell.Run(command, 0, True)
If result <> 0 Then
  errorPath = folder & "\startup-error.local.txt"
  message = "Everything App acilamadi."
  If files.FileExists(errorPath) Then
    message = message & vbCrLf & files.OpenTextFile(errorPath, 1).ReadAll
  End If
  MsgBox message, 16, "Everything App"
End If
WScript.Quit result
