export function getTimeAgo(date: string, locale: string = 'zh') {
    const ONE_MINUTE = 60 * 1000;
    const ONE_HOUR = 60 * ONE_MINUTE;
    const ONE_DAY = 24 * ONE_HOUR;
    const ONE_WEEK = 7 * ONE_DAY;
    const ONE_MONTH = 30 * ONE_DAY;

    const now = new Date().getTime();
    const inputDate = new Date(date).getTime();
    const timeDiff = now - inputDate;

    if (timeDiff < ONE_HOUR) {
        const minutes = Math.floor(timeDiff / ONE_MINUTE);
        switch (locale) {
            case 'en':
                return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
            case 'ja':
                return `${minutes}分前`;
            default: // 'zh'
                return `${minutes}分钟前`;
        }
    } else if (timeDiff < ONE_DAY) {
        const hours = Math.floor(timeDiff / ONE_HOUR);
        switch (locale) {
            case 'en':
                return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
            case 'ja':
                return `${hours}時間前`;
            default: // 'zh'
                return `${hours}时前`;
        }
    } else if (timeDiff < ONE_WEEK) {
        const days = Math.floor(timeDiff / ONE_DAY);
        switch (locale) {
            case 'en':
                return `${days} ${days === 1 ? 'day' : 'days'} ago`;
            case 'ja':
                return `${days}日前`;
            default: // 'zh'
                return `${days}日前`;
        }
    } else if (timeDiff < ONE_MONTH) {
        const weeks = Math.floor(timeDiff / ONE_WEEK);
        switch (locale) {
            case 'en':
                return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
            case 'ja':
                return `${weeks}週間前`;
            default: // 'zh'
                return `${weeks}周前`;
        }
    } else {
        const months = Math.floor(timeDiff / ONE_MONTH);
        switch (locale) {
            case 'en':
                return `${months} ${months === 1 ? 'month' : 'months'} ago`;
            case 'ja':
                return `${months}ヶ月前`;
            default: // 'zh'
                return `${months}月前`;
        }
    }
}
