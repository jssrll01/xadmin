import React from 'react';

// items: [{ id, title, meta, tone }]
export default function Timeline({ items }) {
  return (
    <ol className="ui-tl">
      {(items || []).map((x, i) => (
        <li key={x.id ?? i} className={x.tone || ''}>{x.title}{x.meta ? <small>{x.meta}</small> : null}</li>
      ))}
    </ol>
  );
}
