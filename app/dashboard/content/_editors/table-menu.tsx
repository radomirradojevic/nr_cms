"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Columns3,
  Grid3X3,
  Rows3,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TiptapToolbarState } from "./tiptap-toolbar-state";

type Props = {
  editor: Editor;
  toolbarState: TiptapToolbarState;
};

type TableCommand =
  | "deleteTable"
  | "mergeCells"
  | "splitCell"
  | "toggleHeaderCell"
  | "addRowBefore"
  | "addRowAfter"
  | "deleteRow"
  | "toggleHeaderRow"
  | "addColumnBefore"
  | "addColumnAfter"
  | "deleteColumn"
  | "toggleHeaderColumn"
  | "fixTables";

const PICKER_ROWS = 8;
const PICKER_COLS = 8;

export function TableMenu({ editor, toolbarState }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState({ rows: 1, cols: 1 });
  const inTable = toolbarState.table;

  const can = {
    deleteTable: canRun(editor, "deleteTable"),
    mergeCells: canRun(editor, "mergeCells"),
    splitCell: canRun(editor, "splitCell"),
    toggleHeaderCell: canRun(editor, "toggleHeaderCell"),
    addRowBefore: canRun(editor, "addRowBefore"),
    addRowAfter: canRun(editor, "addRowAfter"),
    deleteRow: canRun(editor, "deleteRow"),
    toggleHeaderRow: canRun(editor, "toggleHeaderRow"),
    addColumnBefore: canRun(editor, "addColumnBefore"),
    addColumnAfter: canRun(editor, "addColumnAfter"),
    deleteColumn: canRun(editor, "deleteColumn"),
    toggleHeaderColumn: canRun(editor, "toggleHeaderColumn"),
    fixTables: canRun(editor, "fixTables"),
  };

  function insertTable(rows: number, cols: number) {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: false })
      .run();
    setOpen(false);
    setSelectedSize({ rows: 1, cols: 1 });
  }

  function run(command: TableCommand) {
    const commands = editor.chain().focus();
    commands[command]().run();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={inTable ? "default" : "ghost"}
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              className="h-8 w-8 p-0"
              aria-label="Insert table"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Insert table</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Grid3X3 className="h-4 w-4" />
            <span>Insert table</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-auto p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {selectedSize.cols} x {selectedSize.rows}
            </div>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${PICKER_COLS}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: PICKER_ROWS * PICKER_COLS }, (_, index) => {
                const row = Math.floor(index / PICKER_COLS) + 1;
                const col = (index % PICKER_COLS) + 1;
                const selected =
                  row <= selectedSize.rows && col <= selectedSize.cols;

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    className={cn(
                      "h-5 w-5 rounded-[3px] border border-border bg-background transition-colors hover:border-primary",
                      selected && "border-primary bg-primary/20",
                    )}
                    aria-label={`Insert ${col} by ${row} table`}
                    onMouseEnter={() => setSelectedSize({ rows: row, cols: col })}
                    onFocus={() => setSelectedSize({ rows: row, cols: col })}
                    onClick={() => insertTable(row, col)}
                  />
                );
              })}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!inTable}>
            <TableIcon className="h-4 w-4" />
            <span>Table properties</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <MenuItem
              disabled={!can.toggleHeaderRow}
              onSelect={() => run("toggleHeaderRow")}
            >
              Toggle header row
            </MenuItem>
            <MenuItem
              disabled={!can.toggleHeaderColumn}
              onSelect={() => run("toggleHeaderColumn")}
            >
              Toggle header column
            </MenuItem>
            <MenuItem disabled={!can.fixTables} onSelect={() => run("fixTables")}>
              Normalize structure
            </MenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <MenuItem
          destructive
          disabled={!can.deleteTable}
          onSelect={() => run("deleteTable")}
        >
          <Trash2 className="h-4 w-4" />
          Delete table
        </MenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!inTable}>
            <span>Cell</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuLabel>Cell properties</DropdownMenuLabel>
            <MenuItem onSelect={() => editor.chain().focus().setTextAlign("left").run()}>
              Align left
            </MenuItem>
            <MenuItem onSelect={() => editor.chain().focus().setTextAlign("center").run()}>
              Align center
            </MenuItem>
            <MenuItem onSelect={() => editor.chain().focus().setTextAlign("right").run()}>
              Align right
            </MenuItem>
            <DropdownMenuSeparator />
            <MenuItem
              disabled={!can.mergeCells}
              onSelect={() => run("mergeCells")}
            >
              Merge cells
            </MenuItem>
            <MenuItem disabled={!can.splitCell} onSelect={() => run("splitCell")}>
              Split cell
            </MenuItem>
            <MenuItem
              disabled={!can.toggleHeaderCell}
              onSelect={() => run("toggleHeaderCell")}
            >
              Toggle header cell
            </MenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!inTable}>
            <Rows3 className="h-4 w-4" />
            <span>Row</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <MenuItem
              disabled={!can.addRowBefore}
              onSelect={() => run("addRowBefore")}
            >
              Insert row before
            </MenuItem>
            <MenuItem
              disabled={!can.addRowAfter}
              onSelect={() => run("addRowAfter")}
            >
              Insert row after
            </MenuItem>
            <MenuItem disabled={!can.deleteRow} onSelect={() => run("deleteRow")}>
              Delete row
            </MenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Row properties</DropdownMenuLabel>
            <MenuItem
              disabled={!can.toggleHeaderRow}
              onSelect={() => run("toggleHeaderRow")}
            >
              Toggle header row
            </MenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!inTable}>
            <Columns3 className="h-4 w-4" />
            <span>Column</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <MenuItem
              disabled={!can.addColumnBefore}
              onSelect={() => run("addColumnBefore")}
            >
              Insert column before
            </MenuItem>
            <MenuItem
              disabled={!can.addColumnAfter}
              onSelect={() => run("addColumnAfter")}
            >
              Insert column after
            </MenuItem>
            <MenuItem
              disabled={!can.deleteColumn}
              onSelect={() => run("deleteColumn")}
            >
              Delete column
            </MenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItem({
  children,
  disabled,
  destructive,
  onSelect,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      variant={destructive ? "destructive" : "default"}
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
    >
      {children}
    </DropdownMenuItem>
  );
}

function canRun(editor: Editor, command: TableCommand) {
  const commands = editor.can();
  const tableCommand = commands[command] as undefined | (() => boolean);

  if (!tableCommand) return false;

  try {
    return tableCommand();
  } catch {
    return false;
  }
}
