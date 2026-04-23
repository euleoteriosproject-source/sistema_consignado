"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, FileImage, Loader2, Plus } from "lucide-react";
import { resellersApi } from "@/lib/api/resellers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const docTypes = [
  { value: "rg_front",        label: "RG — Frente" },
  { value: "rg_back",         label: "RG — Verso" },
  { value: "cnh_front",       label: "CNH — Frente" },
  { value: "cnh_back",        label: "CNH — Verso" },
  { value: "proof_of_address",label: "Comprovante de residência" },
  { value: "selfie",          label: "Selfie segurando documento" },
  { value: "other",           label: "Outro" },
];

interface PendingDoc {
  uid: string;
  type: string;
  file: File;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resellerId: string;
  resellerName: string;
}

export function DocumentUploadModal({ open, onClose, resellerId, resellerName }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState("rg_front");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pending, setPending] = useState<PendingDoc[]>([]);
  const [saving, setSaving] = useState(false);

  const typeLabel = (v: string) => docTypes.find((d) => d.value === v)?.label ?? v;

  function addToPending() {
    if (!selectedFile) return;
    setPending((prev) => [
      ...prev,
      { uid: crypto.randomUUID(), type: docType, file: selectedFile },
    ]);
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePending(uid: string) {
    setPending((prev) => prev.filter((d) => d.uid !== uid));
  }

  async function saveAll() {
    if (pending.length === 0) return;
    setSaving(true);
    let ok = 0;
    for (const doc of pending) {
      try {
        const fd = new FormData();
        fd.append("file", doc.file);
        fd.append("type", doc.type);
        await resellersApi.uploadDocument(resellerId, fd);
        ok++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        toast.error(`Falha ao enviar "${doc.file.name}": ${msg}`);
      }
    }
    setSaving(false);
    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ["reseller-docs", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-completeness", resellerId] });
      toast.success(`${ok} documento(s) salvo(s)!`);
      setPending([]);
    }
  }

  function handleClose() {
    setPending([]);
    setSelectedFile(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar documentos — {resellerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Seletor */}
          <div className="space-y-3 border rounded-lg p-3">
            <div className="space-y-1">
              <Label>Tipo de documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="flex-1 truncate"
              >
                <Upload className="h-4 w-4 mr-1 shrink-0" />
                <span className="truncate">
                  {selectedFile ? selectedFile.name : "Selecionar arquivo..."}
                </span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={addToPending}
                disabled={!selectedFile}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Fila de envio */}
          {pending.length > 0 && (
            <div className="space-y-1">
              <Label>Aguardando envio ({pending.length})</Label>
              {pending.map((doc) => (
                <div key={doc.uid} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <Badge variant="secondary" className="text-xs">{typeLabel(doc.type)}</Badge>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.file.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => removePending(doc.uid)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={saveAll}
              disabled={pending.length === 0 || saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar {pending.length > 0 ? `${pending.length} documento(s)` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
