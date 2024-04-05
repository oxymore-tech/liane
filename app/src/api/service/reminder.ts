import { AppStorage, Trip } from "@liane/common";
import notifee, { AndroidAction, AndroidImportance, TriggerType } from "@notifee/react-native";
import { AppLocalization } from "@/api/i18n";
import { DefaultAndroidSettings } from "@/api/service/notification";
import { getUserTrip } from "@/components/trip/trip";
import { ReactNativeLogger } from "@/api/logger";

const AndroidReminderActions: AndroidAction[] = [
  {
    title: "Démarrer le trajet",
    pressAction: {
      id: "loc"
    }
  }
];

export class ReminderService {
  constructor(private storage: AppStorage, private logger: ReactNativeLogger) {}

  async syncReminders(trips: Trip[]): Promise<void> {
    const now_plus_five = new Date().getTime() + 1000 * 60 * 5;
    const user = await this.storage.getUser();
    const online = trips
      .map(l => {
        const trip = getUserTrip(l, user!.id!);
        return { ...l, departureTime: trip.departureTime, wayPoints: trip.wayPoints };
      })
      .filter(l => l.members.length > 1 && l.driver.canDrive && new Date(l.departureTime).getTime() > now_plus_five);
    await notifee.cancelTriggerNotifications();
    for (const trip of online) {
      await this.createReminder(trip.id!, trip.wayPoints[0].rallyingPoint.label, new Date(trip.departureTime));
    }
  }

  public async cancelReminder(tripId: string) {
    await notifee.cancelTriggerNotification(tripId);
  }

  async createReminder(tripId: string, departureLocationLabel: string, departureTime: Date) {
    const timestamp = departureTime.getTime() - 1000 * 60 * 5;
    const departure = `${AppLocalization.formatDateTime(departureTime)}`;
    this.logger.info("NOTIFICATIONS", `Reminder for ${tripId} - ${departure} will be triggered at ${AppLocalization.formatDateTime(timestamp)}`);
    await notifee.createTriggerNotification(
      {
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
        body: `Vous avez rendez-vous à ${AppLocalization.formatTime(departureTime)} à ${departureLocationLabel}.`,
        data: { uri: `liane://trip/${tripId}`, trip: tripId }
      },
      {
        timestamp,
        type: TriggerType.TIMESTAMP
      }
    );
  }
}
