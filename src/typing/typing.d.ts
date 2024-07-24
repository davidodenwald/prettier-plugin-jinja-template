import type { Printer } from "prettier";

declare module "prettier/plugins/estree" {
  export const printers: {
    estree: Printer;
    "estree-json": Printer;
  };
}
