import { NotificationServiceMock } from "@/api/service/mock/notification";
import { HubServiceMock } from "@/api/service/mock/chat";
import { firstValueFrom, take, toArray } from "rxjs";
import { HubService } from "@/api/service/interfaces/hub";
import { NotificationService } from "@/api/service/interfaces/notification";

describe("notifications counter", () => {
  const initServices = async (): Promise<{ notification: NotificationService; chatHub: HubService }> => {
    const services = {
      notification: new NotificationServiceMock(1) as NotificationService,
      chatHub: new HubServiceMock(1, { delay: 200, count: 1 }) as HubService
    };
    await services.chatHub.start();
    services.notification.initUnreadNotificationCount(services.chatHub.unreadNotificationCount);
    return services;
  };

  test("initial counter should be 1", async () => {
    const services = await initServices();

    await expect(firstValueFrom(services.notification.unreadNotificationCount)).resolves.toEqual(1);
  });

  test("counter should be 0 after read", async () => {
    const services = await initServices();
    const notifications = await services.notification.list();
    expect(notifications.pageSize).toEqual(1);

    // Read notification
    const notification = notifications.data[0];
    await services.notification.markAsRead(notification);

    await expect(firstValueFrom(services.notification.unreadNotificationCount)).resolves.toEqual(0);

    // Read same notification again
    await services.notification.markAsRead(notification);
    await expect(firstValueFrom(services.notification.unreadNotificationCount)).resolves.toEqual(0);
  });

  test("counter should increment", async () => {
    const services = await initServices();
    const observable = services.notification.unreadNotificationCount.pipe(take(2), toArray());
    services.chatHub.subscribeToNotifications(services.notification.receiveNotification);

    await expect(firstValueFrom(observable)).resolves.toEqual([1, 2]);
  });
});
