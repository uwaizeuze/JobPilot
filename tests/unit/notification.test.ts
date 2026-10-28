import { describe, expect, it, vi, beforeEach } from "vitest";
import { Notification, type INotification } from "@/models/notification";
import { NotificationService } from "@/services/notification.service";

vi.mock("@/lib/db", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

const asNotifQuery = (val: unknown) =>
  val as unknown as ReturnType<typeof Notification.findOne>;

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
  });

  it("creates a notification when no duplicate exists", async () => {
    vi.spyOn(Notification, "findOne").mockReturnValue(asNotifQuery(Promise.resolve(null)));
    (vi.spyOn(Notification, "create") as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: "notif-1",
      userId: "user-1",
      title: "Application Submitted",
      message: "Submitted successfully",
      eventType: "submitted",
      read: false,
    } as unknown as INotification);

    const res = await service.sendNotification({
      userId: "user-1",
      title: "Application Submitted",
      message: "Submitted successfully",
      eventType: "submitted",
      deduplicationKey: "sub:app-1",
    });

    expect(res.isDuplicate).toBe(false);
    expect(res.notification._id).toBe("notif-1");
    expect(Notification.create).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate notifications with the same deduplication key", async () => {
    const existing = {
      _id: "notif-existing",
      userId: "user-1",
      title: "High Match Found",
      message: "95% match",
      eventType: "high_match_found",
      read: false,
      deduplicationKey: "high_match:job-1",
    };

    vi.spyOn(Notification, "findOne").mockReturnValue(asNotifQuery(Promise.resolve(existing)));
    vi.spyOn(Notification, "create");

    const res = await service.sendNotification({
      userId: "user-1",
      title: "High Match Found",
      message: "95% match",
      eventType: "high_match_found",
      deduplicationKey: "high_match:job-1",
    });

    expect(res.isDuplicate).toBe(true);
    expect(res.notification._id).toBe("notif-existing");
    expect(Notification.create).not.toHaveBeenCalled();
  });

  it("marks notifications as read", async () => {
    vi.spyOn(Notification, "updateOne").mockResolvedValue({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    });

    const result = await service.markAsRead("user-1", "notif-1");
    expect(result).toBe(true);
    expect(Notification.updateOne).toHaveBeenCalledWith(
      { _id: "notif-1", userId: "user-1" },
      { $set: { read: true } }
    );
  });
});
