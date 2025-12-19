class Helper {
  static CalculateRemainDate(expire: number): string {
    if (expire != null) {
      const diffDate = new Date(expire * 1000).getTime() - new Date().getTime();
      const remainDay = Math.ceil(diffDate / (1000 * 3600 * 24)) - 1;
      if (remainDay >= 0) return remainDay.toString() + " Day Left";
      return Math.abs(remainDay).toString() + " Day Expired";
    }
    return "Never";
  }

  static IsOnline(online_at: string): string {
    if (online_at != null) {
      const diffTime = new Date().getTime() - new Date(online_at).getTime();
      const remainMinutes = Math.ceil(diffTime / (1000 * 60)) - 1;
      if (remainMinutes < 3) return "Online";
      else return "Offline";
    }
    return "Never";
  }

  static CalculateOnlineDate(online_at: string): string {
    if (online_at != null) {
      const diffTime = new Date().getTime() - new Date(online_at).getTime();
      const remainMinutes = Math.ceil(diffTime / (1000 * 60)) - 1;
      if (remainMinutes > 1440) return Math.floor(remainMinutes / 1440).toString() + " Days ago";
      else if (remainMinutes < 3) return "Online";
      else if (remainMinutes > 60)
        return (
          Math.floor(remainMinutes / 60).toString() +
          " Hours " +
          (remainMinutes % 60).toString() +
          " Minutes ago"
        );
      return remainMinutes.toString() + " Minutes ago";
    }
    return "Never";
  }

  static CalculateUpdateSubscriptionDate(online_at: string): string {
    if (online_at != null) {
      const diffTime = new Date().getTime() - new Date(online_at).getTime();
      const remainMinutes = Math.ceil(diffTime / (1000 * 60)) - 1;
      if (remainMinutes > 1440) return Math.floor(remainMinutes / 1440).toString() + " Days ago";
      else if (remainMinutes > 60)
        return (
          Math.floor(remainMinutes / 60).toString() +
          " Hours " +
          (remainMinutes % 60).toString() +
          " Minutes ago"
        );
      return remainMinutes.toString() + " Minutes ago";
    }
    return "Never";
  }

  static CalculateTraffic(volume: number): string {
    if (volume < 1024) return volume.toString() + " B";
    else if (volume < 1024 * 1024) return (volume / 1024).toFixed(2) + " KB";
    else if (volume < 1024 * 1024 * 1024) return (volume / (1024 * 1024)).toFixed(2) + " MB";
    else if (volume < 1024 * 1024 * 1024 * 1024)
      return (volume / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    else if (volume < 1024 * 1024 * 1024 * 1024 * 1024)
      return (volume / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
    return volume.toString();
  }

  static GenerateRandomPassword(length: number): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~!@#$%^&";
    let password = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }
}
export default Helper;
