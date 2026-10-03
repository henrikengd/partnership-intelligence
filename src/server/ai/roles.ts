// Role checks constrain short professional noun phrases; they are not a semantic classifier.
const roleWords = new Set(
  "officer manager director coordinator lead engineer specialist advisor chair president recruiter owner head partner consultant administrator supervisor dean professor technician developer designer researcher liaison representative treasurer secretary chief intern".split(
    " ",
  ),
);
const acronyms = new Set("CEO CTO CFO COO VP CNC IT HR".split(" "));
const commonModifiers = new Set(
  "grant grants manufacturing operations technical software facilities finance fundraising partnership partnerships development engineering hydrology production volunteer community procurement logistics materials composites marketing alumni student faculty board sponsorship human resources business research recruitment sales funding communications international public regional quality cloud supply project program outreach external corporate mechanical electrical environmental legal account computer numerical control".split(
    " ",
  ),
);
export function isGenericRole(value: string) {
  const role = value.trim();
  if (
    !role ||
    role.length > 120 ||
    !/^[\p{L}\p{N}][\p{L}\p{N} &/()-]*$/u.test(role)
  )
    return false;
  const words = role.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (
    words.length > 8 ||
    !words.some(
      (word) => roleWords.has(word.toLowerCase()) || acronyms.has(word),
    )
  )
    return false;
  if (
    /\b(?:ask|contact|email|introduce|introduction|dear|hi|hello|named|ignore|instructions?|send|write|call|reach|approach|tell|request|speak)\b/i.test(
      role,
    )
  )
    return false;
  return words.every(
    (word) =>
      roleWords.has(word.toLowerCase()) ||
      commonModifiers.has(word.toLowerCase()) ||
      acronyms.has(word),
  );
}
