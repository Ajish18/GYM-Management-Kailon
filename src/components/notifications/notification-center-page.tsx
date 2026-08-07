import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { PreferenceToggles } from "@/components/notifications/preference-toggles";
import type { NotificationListItem } from "@/lib/data/notifications";

/** Shared page shell for every role's notification center. The role page
 *  fetches its history (own vs gym scope) and passes it down; this renders
 *  the header (with optional role actions like announce / notify-a-member),
 *  the Inbox tab (filters + list + pager) and the Preferences tab. */
export function NotificationCenterPage({
  title,
  description,
  history,
  hasFilters = false,
  scope = "own",
  memberOptions = [],
  defaultTab = "inbox",
  showPreferences = true,
  actions = null,
}: {
  title: string;
  description: string;
  history: {
    items: NotificationListItem[];
    total: number;
    page: number;
    totalPages: number;
    unreadCount: number;
  };
  hasFilters?: boolean;
  scope?: "own" | "gym";
  memberOptions?: { value: string; label: string }[];
  defaultTab?: string;
  /** Platform admins have no gym scope, so preferences can't be persisted —
   *  hide the tab for them. */
  showPreferences?: boolean;
  actions?: React.ReactNode;
}) {
  const activeTab = showPreferences ? defaultTab : "inbox";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          {showPreferences && <TabsTrigger value="preferences">Preferences</TabsTrigger>}
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          <NotificationCenter
            items={history.items}
            total={history.total}
            page={history.page}
            totalPages={history.totalPages}
            unreadCount={history.unreadCount}
            scope={scope}
            hasFilters={hasFilters}
            memberOptions={memberOptions}
          />
        </TabsContent>

        {showPreferences && (
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>
                  Choose which notification types you want to receive in-app. Announcements and
                  security alerts are always delivered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PreferenceToggles />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
