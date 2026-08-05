package com.ssafy.ssabway.domain.point.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "points")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Point {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "point_id")
    private Long id;

    @Column(name = "station_id", nullable = false)
    private Long stationId;

    @Column(name = "point_code", nullable = false, length = 20)
    private String pointCode;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "floor", nullable = false)
    private Integer floor;
}