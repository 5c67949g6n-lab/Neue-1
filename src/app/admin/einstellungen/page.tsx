import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { formatSettingValue } from "@/lib/admin/schemas";
import { listSettingsForAdmin } from "@/lib/admin/settings";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/feedback";
import { adminText } from "@/i18n/de/admin";
import { SettingForm } from "./setting-form";

export const metadata: Metadata = { title: adminText.settings.title };

const t = adminText.settings;

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await listSettingsForAdmin();

  return (
    <>
      <PageHeader title={t.title} description={t.description} />

      <ul className="grid gap-4 md:grid-cols-2">
        {settings.map((setting) => {
          const label = setting.description || setting.key;
          const isLive = setting.key === "live_bookings_enabled";
          return (
            <li key={setting.key} data-testid={`setting-${setting.key}`}>
              <Card className={isLive ? "border-warning h-full" : "h-full"}>
                <CardHeader>
                  <CardTitle as="h2" className="text-base">
                    {label}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">{setting.key}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLive ? (
                    <Alert tone="warning" title={t.liveWarningTitle}>
                      {t.liveWarning}
                    </Alert>
                  ) : null}
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t.current}: </span>
                    <span className="font-semibold" data-testid="setting-value">
                      {formatSettingValue(setting.value)}
                    </span>
                    {setting.value !== setting.defaultValue ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({t.defaultValue(formatSettingValue(setting.defaultValue))})
                      </span>
                    ) : null}
                  </p>
                  {!setting.stored ? (
                    <p className="text-muted-foreground text-xs">{t.notStored}</p>
                  ) : setting.updatedAt ? (
                    <p className="text-muted-foreground text-xs">
                      {t.updatedAt(formatDateTime(setting.updatedAt), setting.updatedByName)}
                    </p>
                  ) : null}
                  <SettingForm
                    settingKey={setting.key}
                    kind={setting.kind}
                    value={setting.value}
                    bounds={setting.bounds}
                    label={label}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
