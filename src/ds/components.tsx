'use client';

// Thin typed wrappers over the real BTS Studio components on window.BTSStudio.
// The bundle is evaluated once per environment: on the server with React passed in,
// in the browser against window (which also exposes window.BTSStudio, as the system expects).
// Read each component's README in design-system/components/<Name>/ before using it.

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createBTSStudio } from './bundle.generated';
import type * as BTS from './types';

function load(): typeof BTS {
  if (typeof window === 'undefined') return createBTSStudio({ React, ReactDOM });
  const w = window as unknown as { React?: unknown; ReactDOM?: unknown; BTSStudio?: typeof BTS };
  if (!w.BTSStudio) {
    w.React = React;
    w.ReactDOM = ReactDOM;
    createBTSStudio(w);
  }
  return w.BTSStudio!;
}

const S = load();

export function StatusBadge(props: BTS.StatusBadgeProps) {
  return <S.StatusBadge {...props} />;
}
export function RoleBadge(props: BTS.RoleBadgeProps) {
  return <S.RoleBadge {...props} />;
}
export function EventBadge(props: BTS.EventBadgeProps) {
  return <S.EventBadge {...props} />;
}
export function Tabs(props: BTS.TabsProps) {
  return <S.Tabs {...props} />;
}
export function ChoiceChips(props: BTS.ChoiceChipsProps) {
  return <S.ChoiceChips {...props} />;
}
