import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

/** EN | हिं toggle. The choice is remembered in this browser. */
export const LanguageSwitch = ({ onDark, className }: { onDark?: boolean; className?: string }) => {
  const { t, i18n } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={cn("inline-flex rounded-full p-0.5 text-[13px] font-semibold", onDark ? "bg-white/10" : "bg-secondary", className)}
    >
      {LANGUAGES.map(({ code, label, short }) => {
        const active = i18n.language === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            lang={code}
            onClick={() => void i18n.changeLanguage(code)}
            className={cn(
              "rounded-full px-2.5 py-1 transition-colors",
              active
                ? onDark
                  ? "bg-white text-ink-950"
                  : "bg-background text-foreground shadow-sm"
                : onDark
                  ? "text-white/70 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
};
