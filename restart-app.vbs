Option Explicit
Dim shell, files, folder, scriptHost, command
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
folder = files.GetParentFolderName(WScript.ScriptFullName)
scriptHost = shell.ExpandEnvironmentStrings("%WINDIR%") & "\System32\wscript.exe"
command = Chr(34) & scriptHost & Chr(34) & " " & Chr(34) & folder & "\start-app.vbs" & Chr(34) & " /restart"
shell.Run command, 0, False
