"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  AtSign,
  Calendar as CalendarIcon,
  Check,
  CircleDot,
  FileUp,
  Hash,
  ListChecks,
  Loader2,
  Phone,
  Plus,
  Save,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FIELD_TYPES,
  type FieldChoice,
  type FieldOptions,
  type FieldType,
  type FieldValidation,
  type FormFieldRow,
} from "@/lib/form-types";
import { saveFormFields } from "../actions";

type EditableField = {
  id?: string;
  fieldKey: string;
  fieldType: FieldType;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: FieldOptions;
  validation: FieldValidation;
};

const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  text: <TypeIcon className="h-4 w-4" />,
  textarea: <AlignLeft className="h-4 w-4" />,
  email: <AtSign className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  select: <ListChecks className="h-4 w-4" />,
  radio: <CircleDot className="h-4 w-4" />,
  checkbox: <Check className="h-4 w-4" />,
  date: <CalendarIcon className="h-4 w-4" />,
  file: <FileUp className="h-4 w-4" />,
};

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  number: "Number",
  phone: "Phone",
  select: "Dropdown",
  radio: "Radio buttons",
  checkbox: "Checkbox(es)",
  date: "Date",
  file: "File upload",
};

const KEY_RE = /^[a-z][a-z0-9_]*$/;

function defaultKey(type: FieldType, existing: EditableField[]): string {
  let n = 1;
  while (existing.some((f) => f.fieldKey === `${type}_${n}`)) n++;
  return `${type}_${n}`;
}

function blankField(type: FieldType, existing: EditableField[]): EditableField {
  return {
    fieldKey: defaultKey(type, existing),
    fieldType: type,
    label: FIELD_LABELS[type],
    placeholder: "",
    helpText: "",
    required: false,
    options:
      type === "select" || type === "radio" || type === "checkbox"
        ? { choices: [{ value: "option_1", label: "Option 1" }] }
        : {},
    validation: {},
  };
}

function fromRow(r: FormFieldRow): EditableField {
  return {
    id: r.id,
    fieldKey: r.fieldKey,
    fieldType: r.fieldType as FieldType,
    label: r.label,
    placeholder: r.placeholder ?? "",
    helpText: r.helpText ?? "",
    required: r.required,
    options: (r.options ?? {}) as FieldOptions,
    validation: (r.validation ?? {}) as FieldValidation,
  };
}

type Props = {
  formId: string;
  initialFields: FormFieldRow[];
};

export function FieldBuilder({ formId, initialFields }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<EditableField[]>(
    initialFields.map(fromRow),
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    initialFields.length > 0 ? 0 : null,
  );
  const [pending, startSave] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const sortableIds = useMemo(
    () => fields.map((f, i) => f.id ?? `new-${i}-${f.fieldKey}`),
    [fields],
  );

  function addField(type: FieldType) {
    setFields((prev) => {
      const next = [...prev, blankField(type, prev)];
      setSelectedIdx(next.length - 1);
      return next;
    });
  }

  function removeAt(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((cur) =>
      cur === null ? null : cur === idx ? null : cur > idx ? cur - 1 : cur,
    );
  }

  function updateAt(idx: number, patch: Partial<EditableField>) {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sortableIds.indexOf(String(active.id));
    const newIdx = sortableIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    setFields((prev) => arrayMove(prev, oldIdx, newIdx));
    setSelectedIdx((cur) => {
      if (cur === null) return null;
      if (cur === oldIdx) return newIdx;
      if (oldIdx < cur && cur <= newIdx) return cur - 1;
      if (newIdx <= cur && cur < oldIdx) return cur + 1;
      return cur;
    });
  }

  function save() {
    // Pre-validate: keys
    const seen = new Set<string>();
    for (const f of fields) {
      if (!KEY_RE.test(f.fieldKey)) {
        toast.error(`Field key "${f.fieldKey}" is invalid.`);
        return;
      }
      if (seen.has(f.fieldKey)) {
        toast.error(`Duplicate field key "${f.fieldKey}".`);
        return;
      }
      seen.add(f.fieldKey);
      if (!f.label.trim()) {
        toast.error(`Field "${f.fieldKey}" needs a label.`);
        return;
      }
      if (
        (f.fieldType === "select" ||
          f.fieldType === "radio" ||
          f.fieldType === "checkbox") &&
        (f.options.choices?.length ?? 0) === 0
      ) {
        if (f.fieldType !== "checkbox") {
          toast.error(`Field "${f.fieldKey}" needs at least one choice.`);
          return;
        }
      }
    }
    startSave(async () => {
      const res = await saveFormFields({
        formId,
        fields: fields.map((f, i) => ({
          id: f.id,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType,
          label: f.label.trim(),
          placeholder: f.placeholder.trim() || null,
          helpText: f.helpText.trim() || null,
          required: f.required,
          position: i,
          options: f.options,
          validation: f.validation,
        })),
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Fields saved.");
      router.refresh();
    });
  }

  const selected = selectedIdx !== null ? fields[selectedIdx] : null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr_320px]">
      {/* Palette */}
      <div className="space-y-1 rounded-md border p-2">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add field
        </p>
        {FIELD_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => addField(t)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
          >
            <span className="text-muted-foreground">{FIELD_ICONS[t]}</span>
            <span>{FIELD_LABELS[t]}</span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium">Fields ({fields.length})</p>
          <Button onClick={save} size="sm" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Save fields
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No fields yet. Pick a type from the left to add one.
          </p>
        ) : (
          <DndContext
            id="form-fields-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1 p-2">
                {fields.map((f, idx) => (
                  <FieldRow
                    key={sortableIds[idx]}
                    sortableId={sortableIds[idx]}
                    field={f}
                    selected={selectedIdx === idx}
                    onSelect={() => setSelectedIdx(idx)}
                    onRemove={() => removeAt(idx)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Config panel */}
      <div className="rounded-md border p-3">
        {selected === null || selectedIdx === null ? (
          <p className="text-xs text-muted-foreground">
            Select a field to configure it.
          </p>
        ) : (
          <FieldConfig
            field={selected}
            onChange={(patch) => updateAt(selectedIdx, patch)}
          />
        )}
      </div>
    </div>
  );
}

function FieldRow({
  sortableId,
  field,
  selected,
  onSelect,
  onRemove,
}: {
  sortableId: string;
  field: EditableField;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-background px-2 py-2 text-sm",
        selected && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        title="Drag to reorder"
      >
        ⋮⋮
      </button>
      <span className="text-muted-foreground">
        {FIELD_ICONS[field.fieldType]}
      </span>
      <button type="button" onClick={onSelect} className="flex-1 text-left">
        <span className="font-medium">{field.label || "(no label)"}</span>
        {field.required && (
          <span className="ml-1 text-xs text-destructive">*</span>
        )}
        <span className="ml-2 text-xs text-muted-foreground">
          {field.fieldKey}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FieldConfig({
  field,
  onChange,
}: {
  field: EditableField;
  onChange: (patch: Partial<EditableField>) => void;
}) {
  const isChoice =
    field.fieldType === "select" ||
    field.fieldType === "radio" ||
    field.fieldType === "checkbox";
  const isText = field.fieldType === "text" || field.fieldType === "textarea";
  const isNumber = field.fieldType === "number";
  const isFile = field.fieldType === "file";
  const v = field.validation;

  function setValidation(patch: Partial<FieldValidation>) {
    onChange({ validation: { ...field.validation, ...patch } });
  }

  function setChoices(choices: FieldChoice[]) {
    onChange({ options: { ...field.options, choices } });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {FIELD_LABELS[field.fieldType]}
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Field key</Label>
        <Input
          value={field.fieldKey}
          onChange={(e) =>
            onChange({
              fieldKey: e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "_")
                .slice(0, 64),
            })
          }
          className="font-mono text-xs"
        />
        <p className="text-[10px] text-muted-foreground">
          Lowercase letters, digits, underscores. Used in submissions and emails
          as <code>{`{{${field.fieldKey || "field_key"}}}`}</code>.
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Placeholder</Label>
        <Input
          value={field.placeholder}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Help text</Label>
        <Textarea
          rows={2}
          value={field.helpText}
          onChange={(e) => onChange({ helpText: e.target.value })}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Required</Label>
        <Switch
          checked={field.required}
          onCheckedChange={(c) => onChange({ required: c })}
        />
      </div>

      {isText && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Min length</Label>
            <Input
              type="number"
              min={0}
              value={v.minLength ?? ""}
              onChange={(e) =>
                setValidation({
                  minLength:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max length</Label>
            <Input
              type="number"
              min={1}
              value={v.maxLength ?? ""}
              onChange={(e) =>
                setValidation({
                  maxLength:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}

      {isNumber && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              value={v.min ?? ""}
              onChange={(e) =>
                setValidation({
                  min:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              value={v.max ?? ""}
              onChange={(e) =>
                setValidation({
                  max:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}

      {isFile && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">
              Allowed MIME types (comma-separated)
            </Label>
            <Input
              placeholder="image/jpeg, image/png, application/pdf"
              value={(v.accept ?? []).join(", ")}
              onChange={(e) =>
                setValidation({
                  accept: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max file size (KB)</Label>
            <Input
              type="number"
              min={1}
              value={v.maxFileSizeKb ?? ""}
              onChange={(e) =>
                setValidation({
                  maxFileSizeKb:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </>
      )}

      {isChoice && (
        <div className="space-y-2">
          <Label className="text-xs">Choices</Label>
          {(field.options.choices ?? []).map((c, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="value"
                value={c.value}
                onChange={(e) => {
                  const next = arr.slice();
                  next[i] = { ...c, value: e.target.value };
                  setChoices(next);
                }}
                className="font-mono text-xs"
              />
              <Input
                placeholder="label"
                value={c.label}
                onChange={(e) => {
                  const next = arr.slice();
                  next[i] = { ...c, label: e.target.value };
                  setChoices(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setChoices(arr.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const arr = field.options.choices ?? [];
              setChoices([
                ...arr,
                {
                  value: `option_${arr.length + 1}`,
                  label: `Option ${arr.length + 1}`,
                },
              ]);
            }}
          >
            <Plus className="mr-1 h-3 w-3" /> Add choice
          </Button>
          {field.fieldType === "checkbox" && (
            <p className="text-[10px] text-muted-foreground">
              Leave choices empty to render a single boolean checkbox (e.g.
              &ldquo;I agree to the terms&rdquo;).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
