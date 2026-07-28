package com.ssafy.ssabway_webrtc.domain.service;

import io.openvidu.java.client.OpenVidu;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OpenViduService {
    private final OpenVidu openVidu;
}
