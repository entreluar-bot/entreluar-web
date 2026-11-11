import { test, expect } from "@playwright/test";
import { buildMapGuideEmail, parseMapGuide } from "../src/lib/map-guide";

test("guia de pele combina tipo, queixa e rotina sem indicar marca", () => {
  const guide = parseMapGuide({ kind: "skin", skinType: "mista", sensitive: false, change: "linhas", priority: "cuidado", time: "poucos" });
  expect(guide).not.toBeNull();

  const email = buildMapGuideEmail(guide!);
  expect(email.html).toContain("Pele mista não precisa ser tratada como duas inimigas");
  expect(email.html).toContain("retinoides ou retinol");
  expect(email.html).toContain("bioestimuladores de colágeno");
  expect(email.html).not.toContain("SKIN1004");
});

test("guia da travessia traduz fogacho e direciona consulta sem prescrever", () => {
  const guide = parseMapGuide({ kind: "menopause", cycleChange: true, symptoms: ["calor", "intimo"] });
  expect(guide).not.toBeNull();

  const email = buildMapGuideEmail(guide!);
  expect(email.html).toContain("termostato do corpo");
  expect(email.html).toContain("estrogênio isolado");
  expect(email.html).toContain("ACOG");
  expect(email.html).toContain("não como quem entrega uma receita");
});

test("dados inválidos não chegam ao gerador do guia", () => {
  expect(parseMapGuide({ kind: "skin", skinType: "impossível" })).toBeNull();
  expect(parseMapGuide({ kind: "menopause", cycleChange: false, symptoms: ["qualquer-coisa"] })).toBeNull();
});
