import React from 'react';
import { DynamicScreen } from '../../src/generated/DynamicScreen';
import { plan } from '../../src/generated/plan';

export default function HomeScreen() {
  const spec = plan.screens.find((s) => s.id === "home");
  if (!spec) return null;
  return <DynamicScreen spec={spec} projectName={plan.projectName} />;
}
