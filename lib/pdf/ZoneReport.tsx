import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ZoneReportData } from "./report-data";

const blue = "#1e3a5f";
const lightBlue = "#e8f0fe";
const gray = "#64748b";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  // Cover
  coverPage: { padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" },
  coverTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: blue, marginBottom: 8, textAlign: "center" },
  coverSubtitle: { fontSize: 14, color: gray, marginBottom: 4, textAlign: "center" },
  coverDate: { fontSize: 12, color: gray, marginTop: 20, textAlign: "center" },
  coverFooter: { fontSize: 10, color: gray, textAlign: "center", marginTop: 40 },
  // Section
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: blue, marginBottom: 10, marginTop: 20, borderBottomWidth: 1, borderBottomColor: blue, paddingBottom: 4 },
  // KPI row
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: lightBlue, borderRadius: 6, padding: 10, alignItems: "center" },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: blue },
  kpiLabel: { fontSize: 8, color: gray, marginTop: 2, textAlign: "center" },
  // Table
  table: { width: "100%", marginBottom: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: blue, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 4 },
  tableHeaderCell: { color: "white", fontSize: 8, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  tableCell: { fontSize: 8, color: "#334155" },
  // Status
  online: { color: "#16a34a", fontFamily: "Helvetica-Bold" },
  offline: { color: "#dc2626", fontFamily: "Helvetica-Bold" },
  // Footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: gray },
});

export function ZoneReportDocument({ data }: { data: ZoneReportData }) {
  return (
    <Document>
      {/* Cover page */}
      <Page size="LETTER" style={s.coverPage}>
        <Text style={s.coverTitle}>Reporte de Conectividad</Text>
        <Text style={{ fontSize: 20, color: blue, fontFamily: "Helvetica-Bold", textAlign: "center" }}>{data.zona}</Text>
        <Text style={s.coverSubtitle}>Ministerio de Educación de El Salvador</Text>
        <Text style={s.coverDate}>{data.fecha}</Text>
        <Text style={s.coverFooter}>ECOS — Sistema de Monitoreo de Red Escolar</Text>
      </Page>

      {/* Summary + school table */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.sectionTitle}>Resumen — {data.zona}</Text>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.totalEscuelas}</Text>
            <Text style={s.kpiLabel}>Total Escuelas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.online}</Text>
            <Text style={s.kpiLabel}>En línea</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.offline}</Text>
            <Text style={s.kpiLabel}>Fuera de línea</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.velocidadPromedio}</Text>
            <Text style={s.kpiLabel}>Vel. Promedio (Mbps)</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.upsConectadas}</Text>
            <Text style={s.kpiLabel}>UPS Conectadas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.filtroOk}</Text>
            <Text style={s.kpiLabel}>Filtro Contenido OK</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.ticketsAbiertos.length}</Text>
            <Text style={s.kpiLabel}>Tickets Abiertos</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Detalle por Escuela</Text>

        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, { width: "30%" }]}>Escuela</Text>
            <Text style={[s.tableHeaderCell, { width: "12%" }]}>Estado</Text>
            <Text style={[s.tableHeaderCell, { width: "12%" }]}>Vel. (Mbps)</Text>
            <Text style={[s.tableHeaderCell, { width: "14%" }]}>UPS</Text>
            <Text style={[s.tableHeaderCell, { width: "10%" }]}>UPS %</Text>
            <Text style={[s.tableHeaderCell, { width: "11%" }]}>MINED</Text>
            <Text style={[s.tableHeaderCell, { width: "11%" }]}>Filtro</Text>
          </View>

          {data.escuelas.map((e, i) => (
            <View key={i} style={[s.tableRow, i % 2 === 0 ? { backgroundColor: "#f8fafc" } : {}]}>
              <Text style={[s.tableCell, { width: "30%" }]}>{e.nombre}</Text>
              <Text style={[s.tableCell, { width: "12%" }, e.online ? s.online : s.offline]}>
                {e.online ? "En línea" : "Fuera"}
              </Text>
              <Text style={[s.tableCell, { width: "12%" }]}>{e.downloadMbps}</Text>
              <Text style={[s.tableCell, { width: "14%" }]}>{e.upsStatus}</Text>
              <Text style={[s.tableCell, { width: "10%" }]}>{e.upsNivel}%</Text>
              <Text style={[s.tableCell, { width: "11%" }]}>{e.filtroMined === "ACCESIBLE" ? "OK" : "Falla"}</Text>
              <Text style={[s.tableCell, { width: "11%" }]}>{e.filtroAdultos === "BLOQUEADO" ? "OK" : "Falla"}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text>ECOS — MINED El Salvador</Text>
          <Text>{data.fecha}</Text>
        </View>
      </Page>

      {/* Tickets page (only if there are open tickets) */}
      {data.ticketsAbiertos.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Text style={s.sectionTitle}>Tickets Abiertos — {data.zona}</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "20%" }]}>ID Caso</Text>
              <Text style={[s.tableHeaderCell, { width: "30%" }]}>Escuela</Text>
              <Text style={[s.tableHeaderCell, { width: "20%" }]}>Motivo</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Estado</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Fecha</Text>
            </View>

            {data.ticketsAbiertos.map((t, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 0 ? { backgroundColor: "#f8fafc" } : {}]}>
                <Text style={[s.tableCell, { width: "20%" }]}>{t.idCaso}</Text>
                <Text style={[s.tableCell, { width: "30%" }]}>{t.escuela}</Text>
                <Text style={[s.tableCell, { width: "20%" }]}>{t.motivo}</Text>
                <Text style={[s.tableCell, { width: "15%" }]}>{t.estado}</Text>
                <Text style={[s.tableCell, { width: "15%" }]}>{t.fecha}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text>ECOS — MINED El Salvador</Text>
            <Text>{data.fecha}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
