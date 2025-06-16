import React, { useState, useEffect, useRef } from 'react';

// Define the shape of a file system node
interface FileSystemNode {
  type: 'directory' | 'file';
  contents?: { [key: string]: FileSystemNode };
  content?: string;
}

// Define the shape of an output item in the terminal
interface OutputItem {
  type: 'input' | 'output';
  content: string;
}

// Define the shape of the commands object
interface Commands {
  [key: string]: (args: string[]) => string | null;
}

const TerminalEmulator: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('/home/user');
  const [username, setUsername] = useState<string>('user');
  const [hostname] = useState<string>('devifyx');
  const [output, setOutput] = useState<OutputItem[]>([]);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // File system simulation
  const [fileSystem] = useState<FileSystemNode>({
    '/': {
      type: 'directory',
      contents: {
        'home': {
          type: 'directory',
          contents: {
            'user': {
              type: 'directory',
              contents: {
                'documents': { type: 'directory', contents: {} },
                'downloads': { type: 'directory', contents: {} },
                'desktop': { type: 'directory', contents: {} },
                'readme.txt': { type: 'file', content: 'Welcome to DevifyX Terminal!' },
                'config.json': { type: 'file', content: '{"theme": "dark", "font": "monospace"}' }
              }
            }
          }
        },
        'usr': {
          type: 'directory',
          contents: {
            'bin': { type: 'directory', contents: {} },
            'lib': { type: 'directory', contents: {} }
          }
        },
        'etc': {
          type: 'directory',
          contents: {
            'hosts': { type: 'file', content: '127.0.0.1 localhost' }
          }
        }
      }
    }
  });

  // Cursor blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (inputRef.current && !isTyping) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Get current directory contents
  const getCurrentDirectory = (): FileSystemNode | null => {
    const pathParts = currentPath.split('/').filter(Boolean);
    let current: FileSystemNode = fileSystem['/'];

    for (const part of pathParts) {
      if (current.contents && current.contents[part]) {
        current = current.contents[part];
      } else {
        return null;
      }
    }
    return current;
  };

  // Resolve path
  const resolvePath = (path: string): string => {
    if (path.startsWith('/')) {
      return path;
    }
    const parts = currentPath.split('/').filter(Boolean);
    const newParts = path.split('/').filter(Boolean);

    for (const part of newParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }

    return '/' + parts.join('/');
  };

  // Get file/directory at path
  const getFileAtPath = (path: string): FileSystemNode | null => {
    const resolvedPath = resolvePath(path);
    const pathParts = resolvedPath.split('/').filter(Boolean);
    let current: FileSystemNode = fileSystem['/'];

    for (const part of pathParts) {
      if (current.contents && current.contents[part]) {
        current = current.contents[part];
      } else {
        return null;
      }
    }
    return current;
  };

  // Typing effect
  const typeText = (text: string, delay: number = 30): Promise<void> => {
    return new Promise((resolve) => {
      setIsTyping(true);
      let i = 0;
      const type = () => {
        if (i < text.length) {
          setOutput(prev => {
            const newOutput = [...prev];
            if (newOutput.length > 0) {
              newOutput[newOutput.length - 1] = {
                ...newOutput[newOutput.length - 1],
                content: text.substring(0, i + 1)
              };
            }
            return newOutput;
          });
          i++;
          setTimeout(type, delay);
        } else {
          setIsTyping(false);
          resolve();
        }
      };
      type();
    });
  };

  // Command implementations
  const commands: Commands = {
    help: () => {
      return `Available commands:
  help            - Show this help message
  ls              - List directory contents
  cd <path>     - Change directory
  pwd             - Print working directory
  cat <file>      - Display file contents
  mkdir <name>    - Create directory (simulation)
  touch <name>    - Create file (simulation)
  rm <name>       - Remove file/directory (simulation)
  clear           - Clear terminal
  whoami          - Display current user
  date            - Show current date and time
  echo <text>     - Display text
  uname           - System information
  ps              - List running processes
  top             - Display system processes
  history         - Show command history
  exit            - Exit terminal`;
    },

    ls: (args: string[]) => {
      const targetPath = args.length > 0 ? args[0] : '.';
      const dir = getFileAtPath(targetPath);

      if (!dir) {
        return `ls: cannot access '${targetPath}': No such file or directory`;
      }

      if (dir.type !== 'directory') {
        return targetPath;
      }

      const contents = Object.entries(dir.contents || {});
      if (contents.length === 0) {
        return '';
      }

      return contents.map(([name, item]) => {
        const prefix = item.type === 'directory' ? 'd' : '-';
        const permissions = item.type === 'directory' ? 'rwxr-xr-x' : 'rw-r--r--';
        const size = item.type === 'file' ? (item.content?.length || 0) : 4096;
        const date = new Date().toLocaleDateString();
        return `${prefix}${permissions} 1 ${username} ${username} ${size.toString().padStart(8)} ${date} ${name}`;
      }).join('\n');
    },

    cd: (args: string[]) => {
      if (args.length === 0) {
        setCurrentPath('/home/user');
        return '';
      }

      const targetPath = args[0];
      const dir = getFileAtPath(targetPath);

      if (!dir) {
        return `cd: ${targetPath}: No such file or directory`;
      }

      if (dir.type !== 'directory') {
        return `cd: ${targetPath}: Not a directory`;
      }

      setCurrentPath(resolvePath(targetPath));
      return '';
    },

    pwd: () => currentPath,

    cat: (args: string[]) => {
      if (args.length === 0) {
        return 'cat: missing file operand';
      }

      const file = getFileAtPath(args[0]);
      if (!file) {
        return `cat: ${args[0]}: No such file or directory`;
      }

      if (file.type !== 'file') {
        return `cat: ${args[0]}: Is a directory`;
      }

      return file.content || '';
    },

    mkdir: (args: string[]) => {
      if (args.length === 0) {
        return 'mkdir: missing operand';
      }
      return `mkdir: created directory '${args[0]}'`;
    },

    touch: (args: string[]) => {
      if (args.length === 0) {
        return 'touch: missing file operand';
      }
      return `touch: created file '${args[0]}'`;
    },

    rm: (args: string[]) => {
      if (args.length === 0) {
        return 'rm: missing operand';
      }
      return `rm: removed '${args[0]}'`;
    },

    clear: () => {
      setOutput([]);
      return null;
    },

    whoami: () => username,

    date: () => new Date().toString(),

    echo: (args: string[]) => args.join(' '),

    uname: () => 'Linux devifyx 5.15.0-generic x86_64 GNU/Linux',

    ps: () => {
      return `   PID TTY           TIME CMD
  1234 pts/0     00:00:01 bash
  5678 pts/0     00:00:00 ps`;
    },

    top: () => {
      return `top - ${new Date().toLocaleTimeString()} up 1 day, 2:34, 1 user, load average: 0.15, 0.10, 0.05
Tasks: 195 total, 1 running, 194 sleeping, 0 stopped, 0 zombie
%Cpu(s): 2.1 us, 0.8 sy, 0.0 ni, 97.0 id, 0.1 wa, 0.0 hi, 0.0 si, 0.0 st

  PID USER          PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND
  1234 user          20   0  123456   7890   2345 S   1.0  0.4   0:01.23 terminal
  5678 user          20   0   98765   4321   1234 S   0.5  0.2   0:00.45 bash`;
    },

    history: () => {
      return commandHistory.map((cmd, index) => `${index + 1}   ${cmd}`).join('\n');
    },

    exit: () => {
      return 'Goodbye! Terminal session ended.';
    }
  };

  // Execute command
  const executeCommand = async (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add to history
    setCommandHistory(prev => [...prev, trimmedCommand]);
    setHistoryIndex(-1);

    // Add command to output
    const prompt = `${username}@${hostname}:${currentPath}$ ${trimmedCommand}`;
    setOutput(prev => [...prev, { type: 'input', content: prompt }]);

    // Parse command
    const parts = trimmedCommand.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    // Execute command
    if (commands[cmd]) {
      const result = commands[cmd](args);
      if (result !== null) {
        setOutput(prev => [...prev, { type: 'output', content: '' }]);
        if (result) {
          await typeText(result);
        }
      }
    } else {
      setOutput(prev => [...prev, { type: 'output', content: '' }]);
      await typeText(`${cmd}: command not found`);
    }
  };

  // Handle input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isTyping) return;

    if (e.key === 'Enter') {
      executeCommand(currentInput);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  // Handle terminal click
  const handleTerminalClick = () => {
    if (inputRef.current && !isTyping) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-gray-300 text-sm">DevifyX Terminal</div>
            <div className="text-gray-400 text-xs">
              {username}@{hostname}
            </div>
          </div>

          {/* Terminal Content */}
          <div
            ref={terminalRef}
            className="p-4 h-96 overflow-auto bg-black cursor-text"
            onClick={handleTerminalClick}
          >
            {/* Welcome Message */}
            {output.length === 0 && (
              <div className="mb-4 text-cyan-400">
                <div>Welcome to DevifyX Terminal Emulator</div>
                <div>Type 'help' to see available commands</div>
                <div>Press Tab for command completion, Up/Down for history</div>
              </div>
            )}

            {/* Output */}
            {output.map((item, index) => (
              <div key={index} className={`mb-1 ${item.type === 'input' ? 'text-white' : 'text-green-400'}`}>
                {item.content}
              </div>
            ))}

            {/* Current Input Line */}
            {!isTyping && (
              <div className="flex items-center">
                <span className="text-cyan-400">
                  {username}@{hostname}:
                </span>
                <span className="text-blue-400 mr-1">{currentPath}</span>
                <span className="text-white mr-1">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="bg-transparent text-white outline-none flex-1"
                  spellCheck={false}
                  autoComplete="off"
                />
                <span className={`text-white ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}>
                  █
                </span>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 flex justify-between">
            <div>Ready</div>
            <div>Commands: {commandHistory.length}</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-gray-500 text-sm">
          <div className="mb-2">Quick Commands:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>• help - Show help</div>
            <div>• ls - List files</div>
            <div>• cd - Change dir</div>
            <div>• clear - Clear screen</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalEmulator;
