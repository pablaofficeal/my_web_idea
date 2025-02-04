import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  FileText, 
  Folder, 
  Play,
  Download,
  Sun,
  Moon,
  Terminal as TerminalIcon,
  Settings2,
  Plus,
  Save,
  Layout
} from 'lucide-react';
import Editor, { Monaco } from "@monaco-editor/react";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface File {
  name: string;
  content: string;
  language: string;
}

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (showTerminal && terminalRef.current && !terminalInstance.current) {
      const term = new Terminal({
        theme: {
          background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          foreground: theme === 'dark' ? '#ffffff' : '#000000',
        },
        allowProposedApi: true,
        convertEol: true,
        cursorBlink: true,
      });
      
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;
      const webLinksAddon = new WebLinksAddon();
      
      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      
      term.open(terminalRef.current);
      
      const handleResize = () => {
        if (resizeTimeoutRef.current !== null) {
          window.cancelAnimationFrame(resizeTimeoutRef.current);
        }

        resizeTimeoutRef.current = window.requestAnimationFrame(() => {
          if (fitAddonRef.current && terminalRef.current) {
            try {
              fitAddonRef.current.fit();
            } catch (e) {
              console.warn('Terminal resize failed:', e);
            }
          }
          resizeTimeoutRef.current = null;
        });
      };
      
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
        handleResize();
      }
      
      term.writeln('Web Terminal v1.0.0');
      term.writeln('Type "help" for available commands');
      term.write('\r\n$ ');
      
      term.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
        
        if (domEvent.keyCode === 13) {
          term.write('\r\n$ ');
        } else if (printable) {
          term.write(key);
        }
      });
      
      terminalInstance.current = term;
      
      return () => {
        if (resizeTimeoutRef.current !== null) {
          window.cancelAnimationFrame(resizeTimeoutRef.current);
        }
        resizeObserver.disconnect();
        term.dispose();
        terminalInstance.current = null;
        fitAddonRef.current = null;
      };
    }
  }, [showTerminal, theme]);

  useEffect(() => {
    if (activeFile && showPreview && previewRef.current) {
      const updatePreviewDebounced = debounce(updatePreview, 300);
      updatePreviewDebounced();
      return () => updatePreviewDebounced.cancel();
    }
  }, [activeFile?.content, showPreview]);

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    const debouncedFunc: any = (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
    debouncedFunc.cancel = () => clearTimeout(timeout);
    return debouncedFunc;
  };

  const updatePreview = () => {
    if (!activeFile || !previewRef.current) return;

    const isWebFile = ['html', 'css', 'javascript', 'typescript'].includes(activeFile.language);
    if (!isWebFile) return;

    const iframe = previewRef.current;
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    let content = '';
    if (activeFile.language === 'html') {
      content = activeFile.content;
    } else if (activeFile.language === 'css') {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${activeFile.content}</style>
          </head>
          <body>
            <div id="preview">Add elements to style</div>
          </body>
        </html>
      `;
    } else if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <script type="module">
              try {
                ${activeFile.content}
              } catch (error) {
                console.error('Preview error:', error);
              }
            </script>
          </head>
          <body>
            <div id="preview">JavaScript Preview</div>
          </body>
        </html>
      `;
    }

    try {
      iframeDoc.open();
      iframeDoc.write(content);
      iframeDoc.close();
    } catch (error) {
      console.warn('Preview update failed:', error);
    }
  };

  const handleEditorMount = (editor: any, monaco: Monaco) => {
    monaco.editor.defineTheme('customDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1a1a1a',
      }
    });

    monaco.editor.defineTheme('customLight', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
      }
    });
  };

  const createNewFile = () => {
    setShowNewFileDialog(true);
  };

  const handleNewFileSubmit = () => {
    if (newFileName) {
      const extension = newFileName.split('.').pop() || '';
      let language = 'plaintext';
      
      const languageMap: { [key: string]: string } = {
        'js': 'javascript',
        'ts': 'typescript',
        'jsx': 'javascript',
        'tsx': 'typescript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'py': 'python',
      };
      
      language = languageMap[extension] || 'plaintext';
      
      const newFile = {
        name: newFileName,
        content: '',
        language
      };
      
      setFiles([...files, newFile]);
      setActiveFile(newFile);
      setNewFileName('');
      setShowNewFileDialog(false);
    }
  };

  const handleFileChange = (content: string | undefined) => {
    if (activeFile && content !== undefined) {
      const updatedFiles = files.map(f => 
        f.name === activeFile.name ? { ...f, content } : f
      );
      setFiles(updatedFiles);
      setActiveFile({ ...activeFile, content });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const runCode = () => {
    if (activeFile && terminalInstance.current) {
      const term = terminalInstance.current;
      term.writeln('\r\nExecuting ' + activeFile.name + '...');
      
      if (activeFile.language === 'python') {
        term.writeln('Python code:');
        term.writeln(activeFile.content);
      } else if (activeFile.language === 'javascript' || activeFile.language === 'typescript') {
        try {
          const result = new Function(activeFile.content)();
          term.writeln('Result: ' + result);
        } catch (error) {
          term.writeln('Error: ' + error);
        }
      }
      
      term.write('\r\n$ ');
    }
  };

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top Menu Bar */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button 
            onClick={createNewFile}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="New File"
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={toggleTheme}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="Toggle Terminal"
          >
            <TerminalIcon size={20} />
          </button>
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="Toggle Preview"
          >
            <Layout size={20} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-700 rounded"
            title="Settings"
          >
            <Settings2 size={20} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={runCode}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md flex items-center space-x-2"
            title="Run Code"
          >
            <Play size={16} />
            <span>Run</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className={`w-64 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'} p-4`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Explorer</h2>
            <button 
              onClick={createNewFile}
              className="p-1 hover:bg-gray-700 rounded"
            >
              <Plus size={16} />
            </button>
          </div>
          
          <div className="space-y-2">
            {files.map(file => (
              <div
                key={file.name}
                onClick={() => setActiveFile(file)}
                className={`p-2 rounded cursor-pointer flex items-center space-x-2 ${
                  activeFile?.name === file.name 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <FileText size={16} />
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          <div className={`flex-1 flex ${showPreview ? 'space-x-2' : ''}`}>
            {activeFile ? (
              <div className={showPreview ? 'w-1/2' : 'w-full'}>
                <Editor
                  height="100%"
                  theme={theme === 'dark' ? 'customDark' : 'customLight'}
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={handleFileChange}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    automaticLayout: true,
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    snippetSuggestions: 'inline',
                  }}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Select or create a file to start coding</p>
              </div>
            )}

            {/* Live Preview */}
            {showPreview && activeFile && (
              <div className="w-1/2 bg-white">
                <div className={`h-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} flex items-center px-4`}>
                  <span className="text-sm">Preview</span>
                </div>
                <iframe
                  ref={previewRef}
                  className="w-full h-[calc(100%-2rem)] border-none"
                  sandbox="allow-scripts allow-same-origin"
                  title="Preview"
                />
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className={`h-1/3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
              <div className="flex items-center justify-between p-2 border-b border-gray-700">
                <span className="font-semibold">Terminal</span>
                <button 
                  onClick={() => setShowTerminal(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  ×
                </button>
              </div>
              <div ref={terminalRef} className="h-[calc(100%-40px)]" />
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className={`w-80 border-l ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'} p-4`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Editor</h3>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span>Auto Save</span>
                </label>
              </div>

              <div>
                <h3 className="font-medium mb-2">Theme</h3>
                <select 
                  className={`w-full p-2 rounded ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-white'
                  }`}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <h3 className="font-medium mb-2">Extensions</h3>
                <button className="flex items-center space-x-2 text-blue-500 hover:text-blue-400">
                  <Download size={16} />
                  <span>Browse Extensions</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg shadow-xl`}>
            <h3 className="text-lg font-semibold mb-4">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter file name (e.g., main.js)"
              className={`w-full p-2 rounded mb-4 ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewFileDialog(false);
                  setNewFileName('');
                }}
                className="px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleNewFileSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;