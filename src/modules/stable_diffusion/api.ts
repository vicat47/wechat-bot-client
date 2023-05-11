export interface IStableDiffusionResponse {
    images: string[]
    parameters: IDiffusionParam
    info: string
}

export interface IDiffusionParam {
    enable_hr?: boolean
    denoising_strength?: number
    firstphase_width?: number
    firstphase_height?: number
    hr_scale?: number
    hr_upscaler?: any
    hr_second_pass_steps?: number
    hr_resize_x?: number
    hr_resize_y?: number
    prompt?: string
    styles?: any
    seed?: number
    subseed?: number
    subseed_strength?: number
    seed_resize_from_h?: number
    seed_resize_from_w?: number
    sampler_name?: any
    batch_size?: number
    n_iter?: number
    steps?: number
    cfg_scale?: number
    width?: number
    height?: number
    restore_faces?: boolean
    tiling?: boolean
    do_not_save_samples?: boolean
    do_not_save_grid?: boolean
    negative_prompt?: string
    eta?: any
    s_churn?: number
    s_tmax?: any
    s_tmin?: number
    s_noise?: number
    override_settings?: any
    override_settings_restore_afterwards?: boolean
    script_args?: any[]
    sampler_index?: string
    script_name?: any
    send_images?: boolean
    save_images?: boolean
    alwayson_scripts?: any
}