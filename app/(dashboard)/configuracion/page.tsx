import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Ajustes de tu cuenta</p>
      </div>

      <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Cambio de contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">
            Define una nueva contraseña para tu cuenta. Mínimo 8 caracteres.
          </p>
          <div className="max-w-sm">
            <ChangePasswordForm />
          </div>
        </CardContent>
      </Card>

      {/* Opciones futuras (deshabilitadas por ahora) */}
      <Card className="rounded-2xl shadow-sm border bg-white opacity-60" style={{ borderColor: "#e2e8f0" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-500">Preferencias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-400">Próximamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
