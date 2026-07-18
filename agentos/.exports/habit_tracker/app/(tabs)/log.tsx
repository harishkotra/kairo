import React from 'react';
import { DynamicScreen } from '../../src/generated/DynamicScreen';
import { plan } from '../../src/generated/plan';

export default function LogScreen() {
  const spec = plan.screens.find((s) => s.id === "log");
  if (!spec) return null;
  return <DynamicScreen spec={spec} projectName={plan.projectName} />;
}
