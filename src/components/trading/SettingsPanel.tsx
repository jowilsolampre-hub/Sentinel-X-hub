// SENTINEL X - Settings Panel (Appearance, Accent Color, Language)
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Monitor, Moon, Sun } from "lucide-react";

type Theme = "system" | "dark" | "light";
type AccentColor = "green" | "blue" | "cyan" | "amber" | "red" | "purple";

const ACCENT_COLORS: { value: AccentColor; label: string; hsl: string }[] = [
  { value: "green", label: "Green", hsl: "152 69% 45%" },
  { value: "blue", label: "Blue", hsl: "217 91% 60%" },
  { value: "cyan", label: "Cyan", hsl: "189 94% 43%" },
  { value: "amber", label: "Amber", hsl: "38 92% 50%" },
  { value: "red", label: "Red", hsl: "0 84% 60%" },
  { value: "purple", label: "Purple", hsl: "271 76% 53%" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "auto", label: "Auto-detect" },
];

const THEME_KEY = "sentinel-theme";
const ACCENT_KEY = "sentinel-accent";
const LANG_KEY = "sentinel-lang";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
    root.classList.toggle("light", !prefersDark);
  } else if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

function applyAccent(accent: AccentColor) {
  const found = ACCENT_COLORS.find((c) => c.value === accent);
  if (!found) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", found.hsl);
  root.style.setProperty("--ring", found.hsl);
  root.style.setProperty("--chart-1", found.hsl);
  root.style.setProperty("--sidebar-primary", found.hsl);
  root.style.setProperty("--sidebar-ring", found.hsl);
  // Update buy/success color to match if green
  if (accent === "green") {
    root.style.setProperty("--buy", found.hsl);
    root.style.setProperty("--success", found.hsl);
  }
}

export const SettingsPanel = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(THEME_KEY) as Theme) || "dark"; } catch { return "dark"; }
  });
  const [accent, setAccent] = useState<AccentColor>(() => {
    try { return (localStorage.getItem(ACCENT_KEY) as AccentColor) || "green"; } catch { return "green"; }
  });
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || "en"; } catch { return "en"; }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
    try { localStorage.setItem(ACCENT_KEY, accent); } catch {}
  }, [accent]);

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, language); } catch {}
  }, [language]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-lg">General</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Appearance */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Appearance</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> System
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="w-4 h-4" /> Dark
                  </span>
                </SelectItem>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4" /> Light
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Accent color</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    accent === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:border-muted-foreground/50"
                  }`}
                  style={{ backgroundColor: `hsl(${c.hsl})` }}
                  onClick={() => setAccent(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
