package com.ssafy.ssabway.domain.point.repository;

import com.ssafy.ssabway.domain.point.entity.Point;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SignLocationRepository extends JpaRepository<Point, Long> {
    @Query(value = """
        SELECT s.name_ko AS nameKo, p.floor AS floor
        FROM points p
        JOIN stations s ON s.station_id = p.station_id
        WHERE p.point_code = :sign
        """, nativeQuery = true)
    Optional<SignLocationView> findBySign(@Param("sign") String sign);
}