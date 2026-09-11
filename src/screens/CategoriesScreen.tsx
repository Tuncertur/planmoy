import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Search } from "lucide-react";
import { taxonomy, type TaxonomyGroup } from "../lib/taxonomy";
import { tt } from "../lib/i18n";

// FireVibe'ın gerçek src/routes/categories.tsx + src/lib/taxonomy.ts
// dosyalarından birebir taşınmıştır. Orijinal tasarım belgesinde
// "EKSİK YAPMA!" diye özellikle işaretlenmiş bölümdür.

export function CategoriesScreen() {
  const names = Object.keys(taxonomy);
  const [selected, setSelected] = useState(names[0] ?? "Zaman akışı");
  const [query, setQuery] = useState("");
  const group = (taxonomy[selected] ?? taxonomy["Zaman akışı"]) as TaxonomyGroup;
  const filtered = useMemo(
    () => group.items.filter((item) => `${item.name} ${item.children.join(" ")}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))),
    [group, query]
  );
  const total = group.items.reduce((sum, item) => sum + item.children.length, 0);
  const grandTotal = names.reduce((sum, n) => sum + (taxonomy[n]?.items.reduce((s, i) => s + i.children.length, 0) ?? 0), 0);

  return (
    <div>
      <section className="category-intro">
        <div>
          <p className="eyebrow orange">{tt({ tr: "Eksiksiz sınıflandırma", en: "Complete classification" })}</p>
          <h2>
            {tt({ tr: "Akışını doğru", en: "Start your flow" })}
            <br />
            <em>{tt({ tr: "yerden başlat.", en: "from the right place." })}</em>
          </h2>
          <p className="intro">
            {tt({
              tr: "Takvimden Boş Alan'a kadar Planmoy'un tüm ana kategorilerini ve alt seçeneklerini tek yerde keşfet.",
              en: "Explore every main category and sub-option in Planmoy, from Calendar to Open Space.",
            })}
          </p>
        </div>
        <div className="category-count">
          <strong>{names.length}</strong>
          <span>
            {tt({ tr: "ana alan", en: "main areas" })}
            <br />
            {grandTotal} {tt({ tr: "alt seçenek", en: "sub-options" })}
          </span>
        </div>
      </section>

      <div className="category-filterbar" role="tablist" aria-label={tt({ tr: "Akış alanları", en: "Flow areas" })}>
        <span className="category-filter-label">{tt({ tr: "Filtrele", en: "Filter" })}</span>
        {names.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={selected === name}
            className={selected === name ? "selected" : ""}
            onClick={() => {
              setSelected(name);
              setQuery("");
            }}
          >
            {name} <ArrowUpRight size={14} />
          </button>
        ))}
      </div>

      <section className="category-content">
        <div className="category-content-head">
          <div>
            <p className="eyebrow orange">{selected}</p>
            <h3>{group.title}</h3>
            <p>
              {group.items.length} {tt({ tr: "ana kategori", en: "main categories" })} · {total} {tt({ tr: "alt seçenek", en: "sub-options" })}
            </p>
          </div>
          <label className="search-field category-search">
            <Search size={16} />
            <span className="sr-only">{tt({ tr: "Kategorilerde ara", en: "Search categories" })}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tt({ tr: "Bu alanda ara", en: "Search this area" })} />
          </label>
        </div>
        <div className="category-grid">
          {filtered.map((item, index) => (
            <article className="category-card" key={item.name}>
              <div className="category-card-top">
                <span>0{index + 1}</span>
                <Check size={15} />
              </div>
              <h4>{item.name}</h4>
              {item.children.length ? (
                <div className="chip-list">
                  {item.children.map((child) => (
                    <span key={child}>{child}</span>
                  ))}
                </div>
              ) : (
                <p className="free-tag">{tt({ tr: "Etiketleri sen belirlersin.", en: "You decide the tags." })}</p>
              )}
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className="category-empty">
            {tt({ tr: `Bu alanda "${query}" ile eşleşen kategori yok.`, en: `No category matches "${query}" in this area.` })}
          </div>
        )}
      </section>
    </div>
  );
}
