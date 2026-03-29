/**
 * Settings Search - P1 Settings
 */

import { useState, useMemo } from 'react';
import { Search, Settings, ChevronRight, User, Bell, Palette, Shield, Database, Keyboard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'account',
    label: 'Account',
    icon: User,
    items: [
      { id: 'profile', label: 'Profile', description: 'Name, email, avatar', keywords: ['name', 'email', 'avatar', 'photo'] },
      { id: 'password', label: 'Password', description: 'Change password', keywords: ['security', 'login'] },
      { id: 'sessions', label: 'Active Sessions', description: 'Manage logged-in devices', keywords: ['devices', 'logout'] },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    items: [
      { id: 'email-notifs', label: 'Email Notifications', description: 'Backtest completion, alerts', keywords: ['alerts', 'email'] },
      { id: 'push-notifs', label: 'Push Notifications', description: 'Browser notifications', keywords: ['browser', 'desktop'] },
      { id: 'sound', label: 'Sound Effects', description: 'Audio feedback', keywords: ['audio', 'sound', 'mute'] },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
    items: [
      { id: 'theme', label: 'Theme', description: 'Dark, light, or system', keywords: ['dark', 'light', 'mode', 'color'] },
      { id: 'font-size', label: 'Font Size', description: 'Adjust text size', keywords: ['text', 'accessibility'] },
      { id: 'density', label: 'Display Density', description: 'Compact or comfortable', keywords: ['spacing', 'compact'] },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    items: [
      { id: '2fa', label: 'Two-Factor Auth', description: 'Enable 2FA for extra security', keywords: ['2fa', 'authenticator', 'security'] },
      { id: 'api-keys', label: 'API Keys', description: 'Manage API access', keywords: ['api', 'tokens', 'integration'] },
    ],
  },
  {
    id: 'data',
    label: 'Data & Privacy',
    icon: Database,
    items: [
      { id: 'export', label: 'Export Data', description: 'Download your data', keywords: ['download', 'backup'] },
      { id: 'delete', label: 'Delete Account', description: 'Permanently delete account', keywords: ['remove', 'close'] },
    ],
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: Keyboard,
    items: [
      { id: 'shortcuts-list', label: 'View Shortcuts', description: 'All keyboard shortcuts', keywords: ['keys', 'hotkeys', 'bindings'] },
      { id: 'custom-shortcuts', label: 'Customize', description: 'Set custom key bindings', keywords: ['custom', 'modify'] },
    ],
  },
];

interface SettingsSearchProps {
  onSelect?: (categoryId: string, itemId: string) => void;
  className?: string;
}

export function SettingsSearch({ onSelect, className }: SettingsSearchProps) {
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return SETTINGS_CATEGORIES;

    const lowerQuery = query.toLowerCase();

    return SETTINGS_CATEGORIES.map(category => {
      const matchedItems = category.items.filter(item => {
        const searchText = [
          item.label,
          item.description || '',
          ...(item.keywords || []),
        ].join(' ').toLowerCase();

        return searchText.includes(lowerQuery);
      });

      if (matchedItems.length > 0) {
        return { ...category, items: matchedItems };
      }

      // Check if category label matches
      if (category.label.toLowerCase().includes(lowerQuery)) {
        return category;
      }

      return null;
    }).filter((c): c is SettingsCategory => c !== null);
  }, [query]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Categories */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No settings found</p>
            </div>
          ) : (
            filteredCategories.map(category => (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-2">
                  <category.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">{category.label}</h3>
                  <Badge variant="secondary" className="text-[10px] h-4">
                    {category.items.length}
                  </Badge>
                </div>
                <div className="space-y-1 ml-6">
                  {category.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => onSelect?.(category.id, item.id)}
                      className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Settings Categories Sidebar
 */
interface SettingsCategoriesSidebarProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function SettingsCategoriesSidebar({
  activeCategory,
  onSelectCategory,
  className,
}: SettingsCategoriesSidebarProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {SETTINGS_CATEGORIES.map(category => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "flex items-center gap-2 w-full p-2 rounded-md transition-colors text-left",
            activeCategory === category.id
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <category.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{category.label}</span>
        </button>
      ))}
    </div>
  );
}
