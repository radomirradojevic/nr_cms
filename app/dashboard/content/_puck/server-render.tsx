import "server-only";
import { Render } from "@measured/puck/rsc";
import type { Data } from "@measured/puck";
import { puckConfig } from "./config";

export function PuckRender({ data }: { data: Data }) {
  return <Render config={puckConfig} data={data} />;
}
