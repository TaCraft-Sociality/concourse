<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse;

/**
 * The sidebar's footer links, written by the admin one per line as
 * "Label | URL".
 *
 * 🚨 Parsed on the server, and only http(s) or same-site addresses survive:
 * a `javascript:` URL typed into a settings box must never become a link
 * every visitor can click.
 */
class FooterLinks
{
    public const MAX = 12;

    /**
     * @return list<array{label: string, url: string}>
     */
    public static function parse(mixed $value): array
    {
        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $links = [];

        foreach (preg_split('/\R/u', $value) ?: [] as $line) {
            $parts = explode('|', $line, 2);

            if (count($parts) !== 2) {
                continue;
            }

            $label = trim($parts[0]);
            $url = trim($parts[1]);

            if ($label === '' || ! self::safeUrl($url)) {
                continue;
            }

            $links[] = ['label' => mb_substr($label, 0, 40), 'url' => $url];

            if (count($links) >= self::MAX) {
                break;
            }
        }

        return $links;
    }

    public static function safeUrl(string $url): bool
    {
        // Browsers read "/\\evil.example" as "//evil.example", and strip
        // tabs and newlines before they parse, so neither is let through.
        if (preg_match('/[\\s\\\\]/', $url) === 1) {
            return false;
        }

        // A path on this forum: "/p/about", "/tags". Not "//evil.example",
        // which a browser reads as another site.
        if (preg_match('#^/(?!/)#', $url) === 1) {
            return true;
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);
        $scheme = is_string($scheme) ? strtolower($scheme) : null;

        if ($scheme === 'mailto') {
            return str_contains($url, '@');
        }

        return in_array($scheme, ['http', 'https'], true) && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
}
