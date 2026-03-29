/**
 * Developer Tools Page
 * Power user utilities - all local, no API calls
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Code, 
  Database,
  Regex,
  Clock,
  Binary,
  Trash2,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============= JSON Editor =============
function JSONEditor() {
  const [input, setInput] = useState('{\n  "example": "data",\n  "count": 42\n}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const minifyJSON = () => {
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Input JSON</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-sm min-h-[300px]"
            placeholder="Paste JSON here..."
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Output</Label>
            {output && (
              <Button variant="ghost" size="sm" onClick={copyOutput}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            )}
          </div>
          <Textarea
            value={output || error || ''}
            readOnly
            className={cn(
              "font-mono text-sm min-h-[300px]",
              error && "border-destructive text-destructive"
            )}
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button onClick={formatJSON}>Format (Pretty)</Button>
        <Button variant="outline" onClick={minifyJSON}>Minify</Button>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

// ============= Regex Tester =============
function RegexTester() {
  const [pattern, setPattern] = useState('\\d+');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('Test 123 string with 456 numbers');
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const regex = new RegExp(pattern, flags);
      const found = testString.match(regex) || [];
      setMatches(found);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setMatches([]);
    }
  }, [pattern, flags, testString]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 space-y-2">
          <Label>Pattern</Label>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="font-mono"
            placeholder="Regular expression pattern..."
          />
        </div>
        <div className="space-y-2">
          <Label>Flags</Label>
          <Input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            className="font-mono"
            placeholder="g, i, m..."
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Test String</Label>
        <Textarea
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          className="font-mono text-sm min-h-[150px]"
        />
      </div>
      
      {error ? (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-profit" />
            <span>{matches.length} match(es) found</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {matches.map((match, i) => (
              <Badge key={i} variant="secondary" className="font-mono">
                {match}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============= LocalStorage Viewer =============
function LocalStorageViewer() {
  const [items, setItems] = useState<Array<{ key: string; value: string; size: number }>>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadItems = () => {
    const stored: Array<{ key: string; value: string; size: number }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        stored.push({
          key,
          value,
          size: new Blob([value]).size
        });
      }
    }
    stored.sort((a, b) => a.key.localeCompare(b.key));
    setItems(stored);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const selectItem = (key: string) => {
    setSelectedKey(key);
    const value = localStorage.getItem(key) || '';
    try {
      setEditValue(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      setEditValue(value);
    }
  };

  const saveItem = () => {
    if (selectedKey) {
      try {
        // Validate JSON if it looks like JSON
        if (editValue.trim().startsWith('{') || editValue.trim().startsWith('[')) {
          JSON.parse(editValue);
        }
        localStorage.setItem(selectedKey, editValue);
        loadItems();
        toast.success('Saved successfully');
      } catch (e) {
        toast.error('Invalid JSON format');
      }
    }
  };

  const deleteItem = (key: string) => {
    localStorage.removeItem(key);
    loadItems();
    if (selectedKey === key) {
      setSelectedKey(null);
      setEditValue('');
    }
    toast.success(`Deleted: ${key}`);
  };

  const totalSize = items.reduce((acc, item) => acc + item.size, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {items.length} items • {(totalSize / 1024).toFixed(2)} KB total
        </div>
        <Button variant="outline" size="sm" onClick={loadItems}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Keys</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {items.map(item => (
                  <div
                    key={item.key}
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50",
                      selectedKey === item.key && "bg-muted"
                    )}
                    onClick={() => selectItem(item.key)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm truncate">{item.key}</div>
                      <div className="text-xs text-muted-foreground">
                        {(item.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.key);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {selectedKey ? `Edit: ${selectedKey}` : 'Select an item'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedKey ? (
              <div className="space-y-4">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="font-mono text-sm min-h-[320px]"
                />
                <Button onClick={saveItem}>Save Changes</Button>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                Click a key to view/edit its value
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Timestamp Converter =============
function TimestampConverter() {
  const [epochMs, setEpochMs] = useState(Date.now().toString());
  const [humanDate, setHumanDate] = useState('');
  const [isoDate, setIsoDate] = useState('');

  useEffect(() => {
    try {
      const ts = parseInt(epochMs);
      if (!isNaN(ts)) {
        const date = new Date(ts);
        setHumanDate(date.toLocaleString());
        setIsoDate(date.toISOString());
      }
    } catch {
      setHumanDate('Invalid timestamp');
      setIsoDate('');
    }
  }, [epochMs]);

  const setNow = () => {
    setEpochMs(Date.now().toString());
  };

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Epoch Timestamp (ms)</Label>
            <div className="flex gap-2">
              <Input
                value={epochMs}
                onChange={(e) => setEpochMs(e.target.value)}
                className="font-mono"
              />
              <Button variant="outline" onClick={setNow}>Now</Button>
            </div>
          </div>
          
          <div>
            <Label>Human Readable</Label>
            <div className="flex gap-2">
              <Input value={humanDate} readOnly className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => copyValue(humanDate)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label>ISO 8601</Label>
            <div className="flex gap-2">
              <Input value={isoDate} readOnly className="font-mono" />
              <Button variant="ghost" size="icon" onClick={() => copyValue(isoDate)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm">Quick Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>1 second =</span>
              <span>1,000 ms</span>
            </div>
            <div className="flex justify-between">
              <span>1 minute =</span>
              <span>60,000 ms</span>
            </div>
            <div className="flex justify-between">
              <span>1 hour =</span>
              <span>3,600,000 ms</span>
            </div>
            <div className="flex justify-between">
              <span>1 day =</span>
              <span>86,400,000 ms</span>
            </div>
            <div className="flex justify-between">
              <span>1 week =</span>
              <span>604,800,000 ms</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============= Base64 Encoder/Decoder =============
function Base64Tool() {
  const [input, setInput] = useState('Hello, World!');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (mode === 'encode') {
        setOutput(btoa(input));
      } else {
        setOutput(atob(input));
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }, [input, mode]);

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success('Copied');
  };

  const swap = () => {
    setInput(output);
    setMode(mode === 'encode' ? 'decode' : 'encode');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'encode' ? 'default' : 'outline'}
          onClick={() => setMode('encode')}
        >
          Encode
        </Button>
        <Button
          variant={mode === 'decode' ? 'default' : 'outline'}
          onClick={() => setMode('decode')}
        >
          Decode
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{mode === 'encode' ? 'Plain Text' : 'Base64 Input'}</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-sm min-h-[200px]"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={swap}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Swap
              </Button>
              <Button variant="ghost" size="sm" onClick={copyOutput}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
          <Textarea
            value={output}
            readOnly
            className={cn(
              "font-mono text-sm min-h-[200px]",
              error && "border-destructive"
            )}
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <XCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

// ============= Main Component =============
export default function DevTools() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Code className="h-7 w-7" />
          Developer Tools
        </h1>
        <p className="text-muted-foreground">
          Power user utilities for data manipulation and debugging
        </p>
      </div>

      <Tabs defaultValue="json" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="json" className="gap-1">
            <Code className="h-4 w-4" />
            JSON Editor
          </TabsTrigger>
          <TabsTrigger value="regex" className="gap-1">
            <Regex className="h-4 w-4" />
            Regex Tester
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-1">
            <Database className="h-4 w-4" />
            LocalStorage
          </TabsTrigger>
          <TabsTrigger value="timestamp" className="gap-1">
            <Clock className="h-4 w-4" />
            Timestamp
          </TabsTrigger>
          <TabsTrigger value="base64" className="gap-1">
            <Binary className="h-4 w-4" />
            Base64
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json">
          <Card>
            <CardHeader>
              <CardTitle>JSON Editor</CardTitle>
              <CardDescription>
                Format, validate, and minify JSON data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JSONEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regex">
          <Card>
            <CardHeader>
              <CardTitle>Regex Tester</CardTitle>
              <CardDescription>
                Test regular expressions with live matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegexTester />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>LocalStorage Viewer</CardTitle>
              <CardDescription>
                View, edit, and manage browser localStorage data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocalStorageViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timestamp">
          <Card>
            <CardHeader>
              <CardTitle>Timestamp Converter</CardTitle>
              <CardDescription>
                Convert between epoch timestamps and human-readable dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimestampConverter />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="base64">
          <Card>
            <CardHeader>
              <CardTitle>Base64 Encoder/Decoder</CardTitle>
              <CardDescription>
                Encode and decode Base64 strings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Base64Tool />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
