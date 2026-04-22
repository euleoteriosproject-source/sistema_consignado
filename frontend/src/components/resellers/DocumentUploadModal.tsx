"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, FileImage, Loader2 } from "lucide-react";
import { resellersApi } from "@/lib/api/resellers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const docTypes = [
  { value: "rg_front", label: "RG — Frente" },
  { value: "rg_back", label: "RG — Verso" },
  { value: "cnh_front", label: "CNH — Frente" },
  { value: "cnh_back", label: "CNH — Verso" },
  { value: "proof_of_address", label: "Comprovante de residência" },
  { value: "selfie", label: "Selfie segurando documento" },
  { value: "other", label: "Outro" },
];

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

  const { data: docs, isLoading } = useQuery({
    queryKey: ["reseller-docs", resellerId],
    queryFn: () => resellersApi.listDocuments(resellerId),
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", docType);
      return resellersApi.uploadDocument(resellerId, fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-docs", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-completeness", resellerId] });
      toast.success("Documento salvo!");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => resellersApi.deleteDocument(resellerId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller-docs", resellerId] });
      toast.success("Documento removido.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos — {resellerName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-3">
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
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-1" />
                {selectedFile ? selectedFile.name : "Selecionar arquivo..."}
              </Button>
              <Button
                type="button"
                onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  : null}
                Salvar documento
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Documentos enviados</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : docs?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
            ) : (
              docs?.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <Badge variant="secondary" className="text-xs">
                        {docTypes.find((d) => d.value === doc.type)?.label ?? doc.type}
                      </Badge>
                      {doc.fileName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.fileName}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
