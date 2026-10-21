import React from 'react';
import DashboardMain from './DashboardMain.jsx';
import AnalyticsPanel from './Analytics.jsx';

export default function Dashboard() {
  return (
    <>
      <DashboardMain />
      <div style={{ marginTop: 24 }}><AnalyticsPanel /></div>
    </>
  );
}
