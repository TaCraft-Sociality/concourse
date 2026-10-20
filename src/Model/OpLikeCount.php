<?php

/*
 * This file is part of ernestdefoe/concourse.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace ErnestDefoe\Concourse\Model;

use Flarum\Database\AbstractModel;

/**
 * One row per opening post: how many likes it has.
 *
 * Read-only, and only ever loaded through Discussion::concourseOpLikes, whose
 * eager load turns a page of discussion rows into ONE grouped query on
 * flarum/likes' table.
 *
 * @property int $post_id
 * @property int $aggregate
 */
class OpLikeCount extends AbstractModel
{
    protected $table = 'post_likes';

    public $timestamps = false;

    protected $casts = [
        'post_id' => 'integer',
        'aggregate' => 'integer',
    ];
}
