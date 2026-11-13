import labels from './data/person-name-labels.json';

type Label = { nameFa: string; name: string; source: string };
export function personIdentity(person: { id: string; name: string }) {
  const label = (labels as Record<string, Label>)[person.id];
  return { name: label?.name || person.name, nameFa: label?.nameFa || person.name, source: label?.source };
}

export function bilingualName(primary: string, original?: string | null) {
  const names = [...new Set([primary, original].map(name => name?.trim()).filter(Boolean))];
  return names.length > 1 ? `${names[0]} (${names[1]})` : names[0] || '';
}
