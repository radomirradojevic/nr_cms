"use client";

import dynamic from "next/dynamic";
import type { Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "../_puck/config";

const Puck = dynamic(() => import("@measured/puck").then((m) => m.Puck), {
  ssr: false,
});

type Props = {
  value: Data;
  onChange: (data: Data) => void;
};

export function PageEditor({ value, onChange }: Props) {
  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] overflow-hidden rounded-md border">
      <Puck
        config={puckConfig}
        data={value}
        onChange={onChange}
        overrides={{
          header: () => <></>,
        }}
      />
    </div>
  );
}
