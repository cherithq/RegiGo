import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    _request: Request,
    context: {
        params:
            | Promise<{ slug: string }>
            | { slug: string };
    }
) {
    try {
        const { slug } =
            await context.params;
        const supabaseServer =
            await createSupabaseServerClient();

        const { data, error } =
            await supabaseServer.rpc(
                "get_tap_tournament_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

        if (error) {
            throw new Error(error.message);
        }

        let mergedState = data || {};

        if (data?.gameKey === "higher_lower") {
            const {
                data: higherLowerState,
                error: higherLowerError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_higher_lower_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (higherLowerError) {
                throw new Error(
                    higherLowerError.message
                );
            }

            mergedState = {
                ...mergedState,
                ...(higherLowerState || {}),
            };
        }

        if (data?.gameKey === "sort_it_out") {
            const {
                data: sortState,
                error: sortError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_sort_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (sortError) {
                throw new Error(sortError.message);
            }

            mergedState = {
                ...mergedState,
                ...(sortState || {}),
            };
        }

        if (data?.gameKey === "quick_math") {
            const {
                data: quickMathState,
                error: quickMathError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_quick_math_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (quickMathError) {
                throw new Error(quickMathError.message);
            }

            mergedState = {
                ...mergedState,
                ...(quickMathState || {}),
            };
        }

        if (data?.gameKey === "odd_one_out") {
            const {
                data: oddState,
                error: oddError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_odd_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (oddError) {
                throw new Error(oddError.message);
            }

            mergedState = {
                ...mergedState,
                ...(oddState || {}),
            };
        }

        if (data?.gameKey === "color_clash") {
            const {
                data: colourState,
                error: colourError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_color_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (colourError) {
                throw new Error(colourError.message);
            }

            mergedState = {
                ...mergedState,
                ...(colourState || {}),
            };
        }

        if (data?.gameKey === "number_rush") {
            const {
                data: numberState,
                error: numberError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_number_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (numberError) {
                throw new Error(numberError.message);
            }

            mergedState = {
                ...mergedState,
                ...(numberState || {}),
            };
        }

        if (data?.gameKey === "match_cards") {
            const {
                data: matchState,
                error: matchError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_match_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (matchError) {
                throw new Error(matchError.message);
            }

            mergedState = {
                ...mergedState,
                ...(matchState || {}),
            };
        }

        if (data?.gameKey === "grab_coins") {
            const {
                data: grabState,
                error: grabError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_grab_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (grabError) {
                throw new Error(grabError.message);
            }

            mergedState = {
                ...mergedState,
                ...(grabState || {}),
            };
        }

        if (data?.gameKey === "tic_tac_toe") {
            const {
                data: tttState,
                error: tttError,
            } = await supabaseServer.rpc(
                "get_tap_tournament_ttt_public_state_v1",
                {
                    p_event_slug: slug,
                }
            );

            if (tttError) {
                throw new Error(tttError.message);
            }

            mergedState = {
                ...mergedState,
                ...(tttState || {}),
            };
        }

        const {
            data: readyState,
            error: readyError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_ready_public_v1",
            {
                p_event_slug: slug,
            }
        );

        if (readyError) {
            throw new Error(readyError.message);
        }

        mergedState = {
            ...mergedState,
            ...(readyState || {}),
        };

        const {
            data: resultState,
            error: resultError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_result_public_v1",
            {
                p_event_slug: slug,
            }
        );

        if (resultError) {
            throw new Error(resultError.message);
        }

        mergedState = {
            ...mergedState,
            ...(resultState || {}),
        };

        const {
            data: safetyState,
            error: safetyError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_safety_public_v1",
            {
                p_event_slug: slug,
            }
        );

        if (safetyError) {
            throw new Error(safetyError.message);
        }

        mergedState = {
            ...mergedState,
            ...(safetyState || {}),
        };

        const {
            data: broadcastState,
            error: broadcastError,
        } = await supabaseServer.rpc(
            "get_tap_tournament_broadcast_public_v1",
            {
                p_event_slug: slug,
            }
        );

        if (broadcastError) {
            throw new Error(broadcastError.message);
        }

        mergedState = {
            ...mergedState,
            ...(broadcastState || {}),
        };

        return NextResponse.json(
            {
                state: mergedState,
            },
            {
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate, max-age=0",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Unable to load display.",
            },
            {
                status: 400,
            }
        );
    }
}
