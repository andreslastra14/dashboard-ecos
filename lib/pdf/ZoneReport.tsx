import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Circle, G } from "@react-pdf/renderer";
import type { ReportData, DailyStats } from "./report-data";

const blue = "#1e3a5f";
const midBlue = "#2e6da4";
const lightBlue = "#e8f0fe";
const gray = "#64748b";
const green = "#16a34a";
const red = "#dc2626";
const amber = "#d97706";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  coverPage: { padding: 40, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%" },
  coverTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: blue, marginBottom: 8, textAlign: "center" },
  coverSubtitle: { fontSize: 14, color: gray, marginBottom: 4, textAlign: "center" },
  coverDate: { fontSize: 12, color: gray, marginTop: 12, textAlign: "center" },
  coverRange: { fontSize: 11, color: midBlue, marginTop: 6, textAlign: "center", fontFamily: "Helvetica-Bold" },
  coverZones: { fontSize: 10, color: gray, marginTop: 16, textAlign: "center", maxWidth: 400 },
  coverFooter: { fontSize: 10, color: gray, textAlign: "center", marginTop: 40 },
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", color: blue, marginBottom: 10, marginTop: 20, borderBottomWidth: 1, borderBottomColor: blue, paddingBottom: 4 },
  subTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: midBlue, marginBottom: 6, marginTop: 12 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  kpiCard: { flex: 1, backgroundColor: lightBlue, borderRadius: 6, padding: 8, alignItems: "center" },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: blue },
  kpiLabel: { fontSize: 7, color: gray, marginTop: 2, textAlign: "center" },
  table: { width: "100%", marginBottom: 12 },
  tableHeader: { flexDirection: "row", backgroundColor: blue, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 4 },
  tableHeaderCell: { color: "white", fontSize: 7, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  tableCell: { fontSize: 7, color: "#334155" },
  online: { color: green, fontFamily: "Helvetica-Bold" },
  offline: { color: red, fontFamily: "Helvetica-Bold" },
  chartContainer: { marginBottom: 16, marginTop: 8 },
  chartTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: blue, marginBottom: 6 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: gray },
  noData: { fontSize: 10, color: gray, textAlign: "center", padding: 20 },
});

// SVG chart dimensions
const CHART_W = 500;
const CHART_H = 120;
const CHART_PAD = { top: 10, right: 10, bottom: 25, left: 40 };
const PLOT_W = CHART_W - CHART_PAD.left - CHART_PAD.right;
const PLOT_H = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

function AvailabilityChart({ data }: { data: DailyStats[] }) {
  if (data.length < 2) return <Text style={s.noData}>Datos insuficientes para gráfico de disponibilidad</Text>;

  const maxVal = 100;
  const points = data.map((d, i) => {
    const x = CHART_PAD.left + (i / (data.length - 1)) * PLOT_W;
    const y = CHART_PAD.top + PLOT_H - (d.availabilityPct / maxVal) * PLOT_H;
    return { x, y, val: d.availabilityPct, date: d.date };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${CHART_PAD.top + PLOT_H} L ${points[0].x} ${CHART_PAD.top + PLOT_H} Z`;

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  return (
    <View style={s.chartContainer}>
      <Text style={s.chartTitle}>Disponibilidad de Red (%)</Text>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        {/* Grid lines */}
        {yLabels.map((val) => {
          const y = CHART_PAD.top + PLOT_H - (val / maxVal) * PLOT_H;
          return (
            <G key={`grid-${val}`}>
              <Line x1={CHART_PAD.left} y1={y} x2={CHART_PAD.left + PLOT_W} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
              <SvgText x={CHART_PAD.left - 4} y={y + 3} fontSize={7} fill={gray} textAnchor="end">{String(val)}</SvgText>
            </G>
          );
        })}
        {/* Area fill */}
        <Rect x={0} y={0} width={0} height={0} fill="none" />
        {areaD && <SvgPath d={areaD} fill={`${midBlue}30`} />}
        {/* Line */}
        {pathD && <SvgPath d={pathD} stroke={midBlue} strokeWidth={1.5} fill="none" />}
        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2} fill={midBlue} />
        ))}
        {/* X-axis labels (show max 10) */}
        {data.filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).map((d, idx) => {
          const origIdx = data.indexOf(d);
          const x = CHART_PAD.left + (origIdx / (data.length - 1)) * PLOT_W;
          return (
            <SvgText key={`xlabel-${idx}`} x={x} y={CHART_PAD.top + PLOT_H + 12} fontSize={6} fill={gray} textAnchor="middle">
              {d.date.slice(5)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function SpeedChart({ data }: { data: DailyStats[] }) {
  if (data.length < 2) return <Text style={s.noData}>Datos insuficientes para gráfico de velocidad</Text>;

  const maxVal = Math.max(...data.map((d) => d.avgSpeed), 1) * 1.2;
  const points = data.map((d, i) => {
    const x = CHART_PAD.left + (i / (data.length - 1)) * PLOT_W;
    const y = CHART_PAD.top + PLOT_H - (d.avgSpeed / maxVal) * PLOT_H;
    return { x, y, val: d.avgSpeed };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length - 1].x} ${CHART_PAD.top + PLOT_H} L ${points[0].x} ${CHART_PAD.top + PLOT_H} Z`;

  // Y-axis: 4 labels evenly distributed
  const yStep = maxVal / 4;
  const yLabels = [0, 1, 2, 3, 4].map((i) => Math.round(yStep * i * 10) / 10);

  return (
    <View style={s.chartContainer}>
      <Text style={s.chartTitle}>Velocidad Promedio de Descarga (Mbps)</Text>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        {yLabels.map((val) => {
          const y = CHART_PAD.top + PLOT_H - (val / maxVal) * PLOT_H;
          return (
            <G key={`grid-${val}`}>
              <Line x1={CHART_PAD.left} y1={y} x2={CHART_PAD.left + PLOT_W} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
              <SvgText x={CHART_PAD.left - 4} y={y + 3} fontSize={7} fill={gray} textAnchor="end">{String(val)}</SvgText>
            </G>
          );
        })}
        {areaD && <SvgPath d={areaD} fill={`${green}20`} />}
        {pathD && <SvgPath d={pathD} stroke={green} strokeWidth={1.5} fill="none" />}
        {points.map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={2} fill={green} />
        ))}
        {data.filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).map((d, idx) => {
          const origIdx = data.indexOf(d);
          const x = CHART_PAD.left + (origIdx / (data.length - 1)) * PLOT_W;
          return (
            <SvgText key={`xlabel-${idx}`} x={x} y={CHART_PAD.top + PLOT_H + 12} fontSize={6} fill={gray} textAnchor="middle">
              {d.date.slice(5)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

function OnlineOfflineBarChart({ data }: { data: DailyStats[] }) {
  if (data.length < 1) return null;

  const maxVal = Math.max(...data.map((d) => d.totalRecords), 1);
  const barWidth = Math.min(PLOT_W / data.length - 2, 20);

  return (
    <View style={s.chartContainer}>
      <Text style={s.chartTitle}>Registros Online vs Offline por Día</Text>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        {/* Baseline */}
        <Line x1={CHART_PAD.left} y1={CHART_PAD.top + PLOT_H} x2={CHART_PAD.left + PLOT_W} y2={CHART_PAD.top + PLOT_H} stroke="#cbd5e1" strokeWidth={0.5} />
        {data.map((d, i) => {
          const x = CHART_PAD.left + (i / data.length) * PLOT_W + (PLOT_W / data.length - barWidth) / 2;
          const onlineH = (d.onlineRecords / maxVal) * PLOT_H;
          const offlineH = (d.offlineRecords / maxVal) * PLOT_H;
          return (
            <G key={`bar-${i}`}>
              {/* Online (bottom) */}
              <Rect x={x} y={CHART_PAD.top + PLOT_H - onlineH - offlineH} width={barWidth} height={onlineH} fill={green} opacity={0.8} />
              {/* Offline (top) */}
              {offlineH > 0 && (
                <Rect x={x} y={CHART_PAD.top + PLOT_H - offlineH} width={barWidth} height={offlineH} fill={red} opacity={0.7} />
              )}
            </G>
          );
        })}
        {/* X labels */}
        {data.filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1).map((d, idx) => {
          const origIdx = data.indexOf(d);
          const x = CHART_PAD.left + (origIdx / data.length) * PLOT_W + (PLOT_W / data.length) / 2;
          return (
            <SvgText key={`xlabel-${idx}`} x={x} y={CHART_PAD.top + PLOT_H + 12} fontSize={6} fill={gray} textAnchor="middle">
              {d.date.slice(5)}
            </SvgText>
          );
        })}
      </Svg>
      {/* Legend */}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: green, borderRadius: 2 }} />
          <Text style={{ fontSize: 7, color: gray }}>Online</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 8, backgroundColor: red, borderRadius: 2 }} />
          <Text style={{ fontSize: 7, color: gray }}>Offline</Text>
        </View>
      </View>
    </View>
  );
}

// SVG wrappers for text and path inside react-pdf Svg
function SvgText(props: { x: number; y: number; fontSize: number; fill: string; textAnchor?: string; children: string }) {
  return <Text {...props}>{props.children}</Text>;
}

function SvgPath(props: { d: string; stroke?: string; strokeWidth?: number; fill?: string; opacity?: number }) {
  return <SvgPathElement {...props} />;
}

import { Path as SvgPathElement } from "@react-pdf/renderer";

export function ZoneReportDocument({ data }: { data: ReportData }) {
  return (
    <Document>
      {/* Cover page */}
      <Page size="LETTER" style={s.coverPage}>
        <Text style={s.coverTitle}>Reporte de Conectividad</Text>
        <Text style={{ fontSize: 18, color: blue, fontFamily: "Helvetica-Bold", textAlign: "center" }}>
          {data.zonas.length === 1 ? data.zonas[0] : `${data.zonas.length} Departamentos`}
        </Text>
        <Text style={s.coverSubtitle}>Ministerio de Educacion de El Salvador</Text>
        <Text style={s.coverRange}>Periodo: {data.desde} al {data.hasta}</Text>
        {data.zonas.length > 1 && (
          <Text style={s.coverZones}>Zonas: {data.zonas.join(", ")}</Text>
        )}
        <Text style={s.coverDate}>Generado: {data.fechaGeneracion}</Text>
        <Text style={s.coverFooter}>ECOS — Sistema de Monitoreo de Red Escolar</Text>
      </Page>

      {/* Summary page */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.sectionTitle}>Resumen Ejecutivo</Text>
        <Text style={{ fontSize: 8, color: gray, marginBottom: 10 }}>
          Periodo: {data.desde} al {data.hasta} | {data.zonas.join(", ")}
        </Text>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.totalEscuelas}</Text>
            <Text style={s.kpiLabel}>Total Escuelas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: green }]}>{data.online}</Text>
            <Text style={s.kpiLabel}>En Linea</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: red }]}>{data.offline}</Text>
            <Text style={s.kpiLabel}>Fuera de Linea</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.velocidadPromedio}</Text>
            <Text style={s.kpiLabel}>Vel. Prom. (Mbps)</Text>
          </View>
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.upsConectadas}</Text>
            <Text style={s.kpiLabel}>UPS Conectadas</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiValue}>{data.filtroOk}</Text>
            <Text style={s.kpiLabel}>Filtro OK</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: data.ticketsAbiertos.length > 0 ? amber : green }]}>{data.ticketsAbiertos.length}</Text>
            <Text style={s.kpiLabel}>Tickets Abiertos</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text>ECOS — MINED El Salvador</Text>
          <Text>{data.fechaGeneracion}</Text>
        </View>
      </Page>

      {/* Temporal charts page */}
      {data.dailyStats.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Text style={s.sectionTitle}>Tendencias Temporales</Text>
          <Text style={{ fontSize: 8, color: gray, marginBottom: 8 }}>
            Datos historicos del periodo {data.desde} al {data.hasta}
          </Text>

          <AvailabilityChart data={data.dailyStats} />
          <SpeedChart data={data.dailyStats} />

          <View style={s.footer}>
            <Text>ECOS — MINED El Salvador</Text>
            <Text>{data.fechaGeneracion}</Text>
          </View>
        </Page>
      )}

      {/* Bar chart page */}
      {data.dailyStats.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Text style={s.sectionTitle}>Registros Diarios</Text>
          <OnlineOfflineBarChart data={data.dailyStats} />

          {/* Daily stats table */}
          <Text style={s.subTitle}>Detalle Diario</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "20%" }]}>Fecha</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>Registros</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>Online</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>Offline</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>Disp. (%)</Text>
              <Text style={[s.tableHeaderCell, { width: "16%" }]}>Vel. (Mbps)</Text>
            </View>
            {data.dailyStats.map((d, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 0 ? { backgroundColor: "#f8fafc" } : {}]}>
                <Text style={[s.tableCell, { width: "20%" }]}>{d.date}</Text>
                <Text style={[s.tableCell, { width: "16%" }]}>{d.totalRecords}</Text>
                <Text style={[s.tableCell, { width: "16%" }, s.online]}>{d.onlineRecords}</Text>
                <Text style={[s.tableCell, { width: "16%" }, d.offlineRecords > 0 ? s.offline : {}]}>{d.offlineRecords}</Text>
                <Text style={[s.tableCell, { width: "16%" }]}>{d.availabilityPct}%</Text>
                <Text style={[s.tableCell, { width: "16%" }]}>{d.avgSpeed}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text>ECOS — MINED El Salvador</Text>
            <Text>{data.fechaGeneracion}</Text>
          </View>
        </Page>
      )}

      {/* Per-zone breakdown pages */}
      {data.zoneSections.map((zone) => (
        <Page key={zone.zona} size="LETTER" style={s.page}>
          <Text style={s.sectionTitle}>{zone.zona}</Text>

          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiValue}>{zone.totalEscuelas}</Text>
              <Text style={s.kpiLabel}>Escuelas</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiValue, { color: green }]}>{zone.online}</Text>
              <Text style={s.kpiLabel}>Online</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={[s.kpiValue, { color: red }]}>{zone.offline}</Text>
              <Text style={s.kpiLabel}>Offline</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiValue}>{zone.velocidadPromedio}</Text>
              <Text style={s.kpiLabel}>Mbps Prom.</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiValue}>{zone.upsConectadas}</Text>
              <Text style={s.kpiLabel}>UPS</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiValue}>{zone.filtroOk}</Text>
              <Text style={s.kpiLabel}>Filtro OK</Text>
            </View>
          </View>

          <Text style={s.subTitle}>Detalle por Escuela</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "28%" }]}>Escuela</Text>
              <Text style={[s.tableHeaderCell, { width: "12%" }]}>Estado</Text>
              <Text style={[s.tableHeaderCell, { width: "12%" }]}>Vel. (Mbps)</Text>
              <Text style={[s.tableHeaderCell, { width: "14%" }]}>UPS</Text>
              <Text style={[s.tableHeaderCell, { width: "10%" }]}>UPS %</Text>
              <Text style={[s.tableHeaderCell, { width: "12%" }]}>MINED</Text>
              <Text style={[s.tableHeaderCell, { width: "12%" }]}>Filtro</Text>
            </View>
            {zone.escuelas.map((e, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 0 ? { backgroundColor: "#f8fafc" } : {}]}>
                <Text style={[s.tableCell, { width: "28%" }]}>{e.nombre}</Text>
                <Text style={[s.tableCell, { width: "12%" }, e.online ? s.online : s.offline]}>
                  {e.online ? "En linea" : "Fuera"}
                </Text>
                <Text style={[s.tableCell, { width: "12%" }]}>{e.downloadMbps}</Text>
                <Text style={[s.tableCell, { width: "14%" }]}>{e.upsStatus}</Text>
                <Text style={[s.tableCell, { width: "10%" }]}>{e.upsNivel}%</Text>
                <Text style={[s.tableCell, { width: "12%" }]}>{e.filtroMined === "ACCESIBLE" ? "OK" : "Falla"}</Text>
                <Text style={[s.tableCell, { width: "12%" }]}>{e.filtroAdultos === "BLOQUEADO" ? "OK" : "Falla"}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text>ECOS — MINED El Salvador</Text>
            <Text>{data.fechaGeneracion}</Text>
          </View>
        </Page>
      ))}

      {/* Tickets page */}
      {data.ticketsAbiertos.length > 0 && (
        <Page size="LETTER" style={s.page}>
          <Text style={s.sectionTitle}>Tickets Abiertos ({data.ticketsAbiertos.length})</Text>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>ID Caso</Text>
              <Text style={[s.tableHeaderCell, { width: "20%" }]}>Escuela</Text>
              <Text style={[s.tableHeaderCell, { width: "18%" }]}>Zona</Text>
              <Text style={[s.tableHeaderCell, { width: "17%" }]}>Motivo</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Estado</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Fecha</Text>
            </View>
            {data.ticketsAbiertos.map((t, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 0 ? { backgroundColor: "#f8fafc" } : {}]}>
                <Text style={[s.tableCell, { width: "15%" }]}>{t.idCaso}</Text>
                <Text style={[s.tableCell, { width: "20%" }]}>{t.escuela}</Text>
                <Text style={[s.tableCell, { width: "18%" }]}>{t.zona}</Text>
                <Text style={[s.tableCell, { width: "17%" }]}>{t.motivo}</Text>
                <Text style={[s.tableCell, { width: "15%" }]}>{t.estado}</Text>
                <Text style={[s.tableCell, { width: "15%" }]}>{t.fecha}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text>ECOS — MINED El Salvador</Text>
            <Text>{data.fechaGeneracion}</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
