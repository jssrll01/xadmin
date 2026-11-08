import React from 'react';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
      {actions ? <div className="ui-actions">{actions}</div> : null}
    </div>
  );
}
