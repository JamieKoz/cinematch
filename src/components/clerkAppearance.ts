import { dark } from "@clerk/themes";

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#a78bfa",
    colorBackground: "#09090b",
    colorInputBackground: "#18181b",
    colorInputText: "#fafafa",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    borderRadius: "0.75rem"
  },
  elements: {
    modalBackdrop: "bg-black/70 backdrop-blur-sm",
    card: "border border-white/10 shadow-2xl",
    userButtonPopoverCard: "border border-white/10",
    formButtonPrimary:
      "bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:brightness-110 shadow-lg shadow-violet-900/40"
  }
};
