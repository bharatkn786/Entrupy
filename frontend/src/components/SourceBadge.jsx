const SOURCE_ICONS = {
  grailed: "G",
  fashionphile: "F",
  "1stdibs": "1",
};

export default function SourceBadge({ source }) {
  const key = source?.toLowerCase().replace(/\s/g, "");
  const cls = ["grailed", "fashionphile", "1stdibs"].includes(key)
    ? `source-badge--${key}`
    : "source-badge--default";
  return (
    <span className={`source-badge ${cls}`}>
      {SOURCE_ICONS[key] && <span>{SOURCE_ICONS[key]}</span>}
      {source}
    </span>
  );
}