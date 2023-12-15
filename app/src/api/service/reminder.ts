import { AppStorage, Liane, RallyingPoint } from "@liane/common";
import notifee, { AndroidAction, AndroidImportance, TriggerType } from "@notifee/react-native";
import { AppLocalization } from "@/api/i18n";
import { DefaultAndroidSettings } from "@/api/service/notification";
import { getTripFromLiane } from "@/components/trip/trip";
import { ReactNativeLogger } from "@/api/logger";

const AndroidReminderActions: AndroidAction[] = [
  {
    title: "Démarrer le trajet",
    pressAction: {
      id: "loc"
    }
  }
  /*{
    title: "J'ai du retard",
    pressAction: {
      id: "delay",
      launchActivity: "default"
    }
  }*/
];

export class ReminderService {
  constructor(private storage: AppStorage, private logger: ReactNativeLogger) {}

  async syncReminders(lianes: Liane[]): Promise<void> {
    const now = new Date().getTime() + 1000 * 60 * 5;
    const user = await this.storage.getUser();
    const online = lianes
      .map(l => {
        const trip = getTripFromLiane(l, user!.id!);
        return { ...l, departureTime: trip.departureTime, wayPoints: trip.wayPoints };
      })
      .filter(l => l.members.length > 1 && l.driver.canDrive && new Date(l.departureTime).getTime() > now);
    await notifee.cancelTriggerNotifications();
    for (const liane of online) {
      await this.createReminder(liane.id!, liane.wayPoints[0].rallyingPoint, new Date(liane.departureTime));
    }
  }

  public async cancelReminder(lianeId: string) {
    await notifee.cancelTriggerNotification(lianeId);
  }

  async createReminder(lianeId: string, departureLocation: RallyingPoint, departureTime: Date) {
    const timestamp = Math.max(departureTime.getTime() - 1000 * 60 * 5, new Date().getTime() + 5 * 1000);
    const departure = `${AppLocalization.formatDateTime(departureTime)}`;
    this.logger.info("NOTIFICATIONS", `Reminder for ${lianeId} - ${departure} will be triggered at ${AppLocalization.formatDateTime(timestamp)}`);
    await notifee.createTriggerNotification(
      {
        id: lianeId,
        ios: {
          categoryId: "reminder",
          interruptionLevel: "timeSensitive"
        },
        android: {
          ...DefaultAndroidSettings,
          lightUpScreen: true,
          importance: AndroidImportance.HIGH,
          tag: "reminder",
          actions: AndroidReminderActions
        },
        title: "Départ imminent",
        body: `Vous avez rendez-vous à ${AppLocalization.formatTime(departureTime)} à ${departureLocation.label}.`,
        data: { uri: `liane://liane/${lianeId}`, liane: lianeId }
      },
      {
        timestamp,
        type: TriggerType.TIMESTAMP,
        alarmManager: true
      }
    );
  }
}
