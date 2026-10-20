<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Model;

use Flarum\Database\AbstractModel;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One person who has commented in a discussion, and when they last did.
 *
 * Read-only, and only ever loaded through Discussion::concourseParticipants:
 * a grouped read of the posts table, at most a handful of rows per
 * discussion, with each person's user eager-loaded in one more query.
 *
 * @property int $discussion_id
 * @property int $user_id
 * @property User|null $user
 */
class ParticipantRow extends AbstractModel
{
    /** How many of a discussion's latest posts are read for its faces. */
    public const WINDOW = 30;

    protected $table = 'posts';

    public $timestamps = false;

    protected $casts = [
        'discussion_id' => 'integer',
        'user_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
