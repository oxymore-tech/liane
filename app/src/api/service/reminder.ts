import { AppStorage, Liane, RallyingPoint, sync, UTCDateTime } from "@liane/common";
import notifee, { AndroidAction, AndroidImportance, TriggerType } from "@notifee/react-native";
import { AppLocalization } from "@/api/i18n";
import { DefaultAndroidSettings } from "@/api/service/notification";
import { getTripFromLiane } from "@/components/trip/trip";

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
  constructor(private storage: AppStorage) {}

  async syncWithStorage(lianes: Liane[]): Promise<void> {
    let local = (await this.storage.retrieveAsync<LocalLianeData[]>("lianes")) || [];
    const now = new Date().getTime() + 1000 * 60 * 5;
    const user = await this.storage.getUser();
    local = local.filter(l => new Date(l.departureTime).getTime() > now);
    const online = lianes
      .map(l => {
        const trip = getTripFromLiane(l, user!.id!);
        const tripLiane = { ...l, departureTime: trip.departureTime, wayPoints: trip.wayPoints };
        //console.log("reminder online", user!.id!, x.departureTime, x.wayPoints[0].rallyingPoint.label);
        return tripLiane;
      })
      .filter(l => l.members.length > 1 && l.driver.canDrive && new Date(l.departureTime).getTime() > now);

    const { added, removed, stored } = sync(
      online,
      local,
      liane => ({ lianeId: liane.id!, departureTime: liane.departureTime }),
      l => l.id!,
      d => d.lianeId,
      (l, d) => l.departureTime !== d.departureTime
    );
    for (const r of removed) {
      await this.cancelReminder(r.lianeId);
    }
    for (const liane of added) {
      //console.log("reminder", user!.id!, liane.departureTime, liane.wayPoints[0].rallyingPoint.label);
      await this.createReminder(liane.id!, liane.wayPoints[0].rallyingPoint, new Date(liane.departureTime));
    }

    await this.storage.storeAsync("lianes", stored);
  }

  public async cancelReminder(lianeId: string) {
    await notifee.cancelTriggerNotification(lianeId);
  }

  async createReminder(lianeId: string, departureLocation: RallyingPoint, departureTime: Date) {
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
        timestamp: Math.max(departureTime.getTime() - 1000 * 60 * 5, new Date().getTime() + 5 * 1000),
        type: TriggerType.TIMESTAMP,
        alarmManager: true
      }
    );
  }
}

export type LocalLianeData = {
  lianeId: string;
  departureTime: UTCDateTime;
};
