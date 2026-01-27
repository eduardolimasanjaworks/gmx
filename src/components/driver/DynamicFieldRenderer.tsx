import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DynamicFieldRendererProps {
  fieldType: string;
  value: any;
  fieldName?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-success text-success-foreground" },
  inactive: { label: "Inativo", className: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspenso", className: "bg-destructive text-destructive-foreground" },
  available: { label: "Disponível, vázio", className: "bg-success text-success-foreground" },
  busy: { label: "Em Viagem", className: "bg-warning text-warning-foreground" },
  waiting_advance: { label: "Aguardando adiantamento", className: "bg-blue-500 text-white" },
  waiting_unload: { label: "Esperando para descarregar", className: "bg-orange-500 text-white" },
};

export const DynamicFieldRenderer = ({ fieldType, value, fieldName }: DynamicFieldRendererProps) => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  switch (fieldType) {
    case "badge":
      const config = statusConfig[value] || { label: value, className: "bg-secondary" };
      return <Badge className={config.className}>{config.label}</Badge>;

    case "date":
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return <span>{String(value)}</span>;
        return <span>{format(date, "dd/MM/yyyy", { locale: ptBR })}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }

    case "datetime":
      try {
        const datetime = new Date(value);
        if (isNaN(datetime.getTime())) return <span>{String(value)}</span>;
        return <span>{format(datetime, "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>;
      } catch {
        return <span>{String(value)}</span>;
      }

    case "email":
      return <a href={`mailto:${value}`} className="text-primary hover:underline">{value}</a>;

    case "phone":
      const cleanPhone = String(value).replace(/\D/g, "");
      const formattedPhone = cleanPhone.length === 11 
        ? `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`
        : value;
      return <a href={`tel:${cleanPhone}`} className="text-primary hover:underline">{formattedPhone}</a>;

    case "boolean":
      return value ? <Badge variant="outline">Sim</Badge> : <Badge variant="outline">Não</Badge>;

    case "number":
      return <span>{Number(value).toLocaleString("pt-BR")}</span>;

    case "currency":
      return <span>R$ {Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;

    default:
      return <span>{String(value)}</span>;
  }
};
